/**
 * GitLab Webhook Handler (enhanced)
 * POST /api/webhooks/gitlab
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GitPrStatus } from "@prisma/client";
import { langfuse } from "@/lib/langfuse";

const ISSUE_KEY_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/g;
function extractIssueKeys(text: string): string[] {
    return Array.from(new Set([...text.matchAll(ISSUE_KEY_RE)].map(m => m[1])));
}

function mapGitLabMRState(state: string, mergedAt?: string | null): GitPrStatus {
    if (mergedAt || state === "merged") return GitPrStatus.MERGED;
    if (state === "closed") return GitPrStatus.CLOSED;
    return GitPrStatus.OPEN;
}

export async function POST(req: Request) {
    const start = Date.now();
    const token = req.headers.get("x-gitlab-token") ?? "";
    const expectedToken = process.env.GITLAB_WEBHOOK_SECRET ?? "";
    if (expectedToken && token !== expectedToken) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const event = req.headers.get("x-gitlab-event") ?? "";
    let payload: Record<string, unknown>;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    let processed = 0;

    try {
        if (event === "Merge Request Hook") {
            const mr = payload.object_attributes as any;
            const repo = (payload.project as any)?.path_with_namespace ?? "unknown/repo";
            const allText = `${mr.title ?? ""} ${mr.description ?? ""} ${mr.source_branch ?? ""}`;
            const keys = extractIssueKeys(allText);
            const status = mapGitLabMRState(mr.state, mr.merged_at);

            for (const key of keys) {
                const issue = await prisma.pmIssue.findUnique({ where: { key } });
                if (!issue) continue;

                await prisma.pmGitLink.upsert({
                    where: {
                        issueId_provider_repoName_prNumber: {
                            issueId: issue.id,
                            provider: "gitlab",
                            repoName: repo,
                            prNumber: mr.iid,
                        }
                    },
                    create: {
                        issueId: issue.id,
                        provider: "gitlab",
                        repoName: repo,
                        prNumber: mr.iid,
                        prTitle: mr.title,
                        prUrl: mr.url,
                        status,
                        branch: mr.source_branch,
                    },
                    update: { status, prTitle: mr.title },
                });

                if (status === GitPrStatus.MERGED && issue.status !== "DONE") {
                    await prisma.pmIssue.update({
                        where: { id: issue.id },
                        data: { status: "IN_REVIEW" },
                    });
                }
                processed++;
            }
        } else if (event === "Push Hook") {
            const commits = (payload.commits as any[]) ?? [];
            for (const commit of commits) {
                const keys = extractIssueKeys(`${commit.message ?? ""} ${commit.title ?? ""}`);
                for (const key of keys) {
                    const issue = await prisma.pmIssue.findUnique({ where: { key } });
                    if (!issue) continue;
                    await prisma.pmIssueActivity.create({
                        data: {
                            issueId: issue.id,
                            actorId: issue.creatorId,
                            field: "git.commit",
                            newValue: `${commit.id?.slice(0, 7)}: ${commit.message?.slice(0, 100)}`,
                        }
                    });
                    processed++;
                }
            }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[gitlab webhook]", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }

    langfuse.trace({
        name: "webhook.gitlab",
        metadata: { event, processed, latencyMs: Date.now() - start }
    });

    return NextResponse.json({ ok: true, event, processed });
}

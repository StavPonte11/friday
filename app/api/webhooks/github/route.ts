/**
 * GitHub Webhook Handler
 * POST /api/webhooks/github
 * 
 * Handles: push, pull_request (opened/merged/closed), pull_request_review
 * Parses issue keys from branch names and commit messages (e.g. "fixes PROJ-12")
 * Automatically transitions FRIDAY issues on PR merge.
 */

import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { GitPrStatus } from "@prisma/client";
import { langfuse } from "@/lib/langfuse";

// ─── Key parsing ──────────────────────────────────────────────────────────────
const ISSUE_KEY_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/g;

function extractIssueKeys(text: string): string[] {
    return Array.from(new Set([...text.matchAll(ISSUE_KEY_RE)].map(m => m[1])));
}

async function findIssueByKey(key: string) {
    return prisma.pmIssue.findUnique({ where: { key } });
}

// ─── Signature verification ───────────────────────────────────────────────────
function verifyGithubSignature(payload: string, signature: string, secret: string): boolean {
    const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
    return expected === signature;
}

// ─── Event handlers ────────────────────────────────────────────────────────────
async function handlePullRequest(payload: {
    action: string;
    pull_request: {
        number: number;
        title: string;
        html_url: string;
        state: string;
        merged: boolean;
        head: { ref: string };
        body?: string;
    };
    repository: { full_name: string };
}) {
    const pr = payload.pull_request;
    const repoName = payload.repository.full_name;
    const branch = pr.head.ref;

    // Extract issue keys from: title + body + branch name
    const allText = `${pr.title} ${pr.body ?? ""} ${branch}`;
    const issueKeys = extractIssueKeys(allText);

    if (issueKeys.length === 0) return { processed: 0 };

    let prStatus: GitPrStatus;
    if (pr.merged) prStatus = GitPrStatus.MERGED;
    else if (pr.state === "closed") prStatus = GitPrStatus.CLOSED;
    else if (pr.title.startsWith("[Draft]") || pr.title.startsWith("Draft:")) prStatus = GitPrStatus.DRAFT;
    else prStatus = GitPrStatus.OPEN;

    let processed = 0;
    for (const key of issueKeys) {
        const issue = await findIssueByKey(key);
        if (!issue) continue;

        // Upsert git link
        await prisma.pmGitLink.upsert({
            where: {
                issueId_provider_repoName_prNumber: {
                    issueId: issue.id,
                    provider: "github",
                    repoName,
                    prNumber: pr.number,
                }
            },
            create: {
                issueId: issue.id,
                provider: "github",
                repoName,
                prNumber: pr.number,
                prTitle: pr.title,
                prUrl: pr.html_url,
                status: prStatus,
                branch,
            },
            update: { status: prStatus, prTitle: pr.title },
        });

        // Auto-transition on merge
        if (prStatus === GitPrStatus.MERGED && issue.status !== "DONE") {
            await prisma.pmIssue.update({
                where: { id: issue.id },
                data: { status: "IN_REVIEW" }, // move to review, not done (human verifies)
            });
            await prisma.pmIssueActivity.create({
                data: {
                    issueId: issue.id,
                    actorId: issue.creatorId,
                    field: "status",
                    oldValue: issue.status,
                    newValue: "IN_REVIEW",
                }
            });
        }

        processed++;
    }

    return { processed, issueKeys };
}

async function handlePush(payload: {
    commits: Array<{ message: string; id: string; url: string }>;
    repository: { full_name: string };
}) {
    const repoName = payload.repository.full_name;
    let processed = 0;

    for (const commit of payload.commits) {
        const keys = extractIssueKeys(commit.message);
        for (const key of keys) {
            const issue = await findIssueByKey(key);
            if (!issue) continue;

            // Log activity for commit reference
            await prisma.pmIssueActivity.create({
                data: {
                    issueId: issue.id,
                    actorId: issue.creatorId,
                    field: "git.commit",
                    newValue: `${repoName}#${commit.id.slice(0, 7)}: ${commit.message.slice(0, 100)}`,
                }
            });
            processed++;
        }
    }

    return { processed };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    const start = Date.now();
    const event = req.headers.get("x-github-event") ?? "unknown";
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const rawBody = await req.text();

    // Verify signature if secret is configured
    const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
    if (secret && !verifyGithubSignature(rawBody, signature, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    let result: Record<string, unknown> = { event, processed: 0 };

    try {
        if (event === "pull_request") {
            result = { event, ...(await handlePullRequest(payload as any)) };
        } else if (event === "push") {
            result = { event, ...(await handlePush(payload as any)) };
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[github webhook]", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }

    langfuse.trace({
        name: "webhook.github",
        metadata: { event, ...result, latencyMs: Date.now() - start }
    });

    return NextResponse.json({ ok: true, ...result });
}

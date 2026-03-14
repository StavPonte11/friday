import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GitLab webhook event schema (subset of GitLab issue events)
const GitLabWebhookSchema = z.object({
    object_kind: z.string(),
    project: z.object({
        id: z.number(),
        name: z.string(),
        web_url: z.string(),
    }),
    object_attributes: z.object({
        id: z.number(),
        iid: z.number(),
        title: z.string(),
        description: z.string().nullable().optional(),
        state: z.enum(["opened", "closed"]),
        url: z.string().optional(),
    }),
    assignees: z.array(z.object({ username: z.string() })).optional().default([]),
    labels: z.array(z.object({ title: z.string() })).optional().default([]),
}).passthrough();

/**
 * GitLab webhook receiver.
 * 
 * Register this URL in your GitLab project settings under Webhooks:
 * URL: https://your-friday-domain.com/api/webhooks/gitlab
 * Trigger: Issues events
 * 
 * Secret token: Set GITLAB_WEBHOOK_SECRET env var and add as "Secret token" in GitLab.
 */
export async function POST(req: NextRequest) {
    // Verify webhook secret (optional but recommended)
    const secret = process.env.GITLAB_WEBHOOK_SECRET;
    if (secret) {
        const gitlabToken = req.headers.get("x-gitlab-token");
        if (gitlabToken !== secret) {
            console.warn("[GitLab Webhook] Invalid secret token");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parse = GitLabWebhookSchema.safeParse(body);
    if (!parse.success) {
        console.warn("[GitLab Webhook] Invalid payload:", parse.error.flatten());
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const event = parse.data;

    // Only handle issue events
    if (event.object_kind !== "issue") {
        return NextResponse.json({ status: "ignored", reason: "Not an issue event" });
    }

    const gitlabProjectId = event.project.id;
    const gitlabIssueId = event.object_attributes.iid;
    const newState = event.object_attributes.state;

    // Find linked FRIDAY issues
    const links = await prisma.pmGitLabLink.findMany({
        where: { gitlabProjectId, gitlabIssueId },
        include: { issue: { select: { id: true, key: true, status: true } } }
    });

    if (links.length === 0) {
        return NextResponse.json({ status: "ok", synced: 0 });
    }

    let synced = 0;
    for (const link of links) {
        const fridayIssue = link.issue;

        if (newState === "closed" && fridayIssue.status !== "DONE") {
            // GitLab issue was closed → close FRIDAY issue
            await prisma.pmIssue.update({
                where: { id: fridayIssue.id },
                data: { status: "DONE" }
            });
            await prisma.pmIssueActivity.create({
                data: {
                    issueId: fridayIssue.id,
                    actorId: "system",
                    field: "status",
                    oldValue: fridayIssue.status,
                    newValue: "DONE",
                }
            });
            synced++;
        } else if (newState === "opened" && fridayIssue.status === "DONE") {
            // GitLab issue was reopened → reopen FRIDAY issue
            await prisma.pmIssue.update({
                where: { id: fridayIssue.id },
                data: { status: "IN_PROGRESS" }
            });
            synced++;
        }

        // Update sync timestamp
        await prisma.pmGitLabLink.update({ where: { id: link.id }, data: { synced: true } });
    }

    return NextResponse.json({ status: "ok", synced, total: links.length });
}

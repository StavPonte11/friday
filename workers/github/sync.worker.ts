/**
 * GitHub Sync Worker
 * Listens on RabbitMQ for `friday.pm.github.sync` messages.
 * Links GitHub PRs to Friday PM issues by extracting issue keys from PR title/body.
 * Enforces Definition of Done (DoD): marks issue as IN_REVIEW when PR is opened,
 * and DONE when PR is merged.
 */
import { queueService, QUEUES } from "../shared/queues";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface GitHubSyncPayload {
    action: "opened" | "merged" | "closed";
    prTitle: string;
    prBody: string;
    prUrl: string;
    mergedAt?: string;
    projectKey: string; // e.g. FPM — used to extract issue keys
}

/** Extract all issue keys from PR text (e.g. "FPM-42") */
function extractIssueKeys(projectKey: string, text: string): string[] {
    const regex = new RegExp(`${projectKey}-\\d+`, "gi");
    return [...new Set((text.match(regex) ?? []).map((k) => k.toUpperCase()))];
}

async function processGitHubSync(payload: GitHubSyncPayload): Promise<void> {
    const { action, prTitle, prBody, prUrl, mergedAt, projectKey } = payload;

    const keys = extractIssueKeys(projectKey, `${prTitle} ${prBody}`);
    if (keys.length === 0) {
        console.log("[GitHubSync] No issue keys found in PR, skipping.");
        return;
    }

    console.log(`[GitHubSync] PR ${action} — linked issues: ${keys.join(", ")}`);

    for (const key of keys) {
        const issue = await prisma.pmIssue.findUnique({ where: { key } });
        if (!issue) {
            console.warn(`[GitHubSync] Issue ${key} not found in Friday PM`);
            continue;
        }

        if (action === "opened") {
            await prisma.pmIssue.update({
                where: { key },
                data: { status: "IN_REVIEW" },
            });
            await prisma.pmComment.create({
                data: {
                    issueId: issue.id,
                    authorId: issue.creatorId,
                    content: `🔗 GitHub PR opened: [${prTitle}](${prUrl})`,
                },
            });
            console.log(`[GitHubSync] ${key} → IN_REVIEW`);
        }

        if (action === "merged" && mergedAt) {
            await prisma.pmIssue.update({
                where: { key },
                data: { status: "DONE" },
            });
            await prisma.pmComment.create({
                data: {
                    issueId: issue.id,
                    authorId: issue.creatorId,
                    content: `✅ PR merged on ${mergedAt}: [${prTitle}](${prUrl})`,
                },
            });
            console.log(`[GitHubSync] ${key} → DONE`);
        }

        if (action === "closed" && !mergedAt) {
            // PR closed without merge — revert to in-progress
            await prisma.pmIssue.update({
                where: { key },
                data: { status: "IN_PROGRESS" },
            });
            console.log(`[GitHubSync] ${key} → IN_PROGRESS (PR closed without merge)`);
        }
    }
}

export async function startGitHubSyncWorker(): Promise<void> {
    await queueService.connect();
    await queueService.subscribe<GitHubSyncPayload>(QUEUES.GITHUB_SYNC, processGitHubSync);
    console.log("[GitHubSync] Worker started, listening on", QUEUES.GITHUB_SYNC);
}

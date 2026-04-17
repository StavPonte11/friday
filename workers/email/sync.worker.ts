/**
 * Email Sync Worker
 * Listens on RabbitMQ for `friday.pm.email.sync` messages.
 * Converts inbound emails into PM issues or comments based on subject line parsing.
 * Supports: new issue creation, reply-to-comment threading.
 */
import { queueService, QUEUES } from "../shared/queues";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

interface EmailSyncPayload {
    from: string;            // sender email
    subject: string;         // email subject
    body: string;            // plain-text body
    projectKey: string;      // e.g. FPM
    threadId?: string;       // if reply — maps to existing issue key
}

/** Extract issue key from subject (e.g. "Re: [FPM-12] Fix login bug") */
function extractIssueKey(projectKey: string, subject: string): string | null {
    const match = subject.match(new RegExp(`\\[?(${projectKey}-\\d+)\\]?`, "i"));
    return match ? match[1].toUpperCase() : null;
}

async function processEmail(payload: EmailSyncPayload): Promise<void> {
    const { from, subject, body, projectKey } = payload;

    console.log(`[EmailSync] Processing email from ${from}: "${subject}"`);

    const issueKey = extractIssueKey(projectKey, subject);

    // Case 1: Email is a reply to an existing issue — create comment
    if (issueKey) {
        const issue = await prisma.pmIssue.findUnique({ where: { key: issueKey } });
        if (!issue) {
            console.warn(`[EmailSync] Issue ${issueKey} not found.`);
            return;
        }

        await prisma.pmComment.create({
            data: {
                issueId: issue.id,
                authorId: issue.creatorId, // best-effort attribution
                content: `📧 **Email reply from** \`${from}\`:\n\n${body}`
            }
        });

        await auditLog({
            userId: issue.creatorId,
            action: "EMAIL_REPLY",
            entityType: "PmComment",
            entityId: issue.id,
            details: { from, subject }
        });

        console.log(`[EmailSync] Comment added to ${issueKey} from ${from}`);
        return;
    }

    // Case 2: New email — create issue in this project
    const project = await prisma.pmProject.findFirst({ where: { key: projectKey } });
    if (!project) {
        console.warn(`[EmailSync] Project ${projectKey} not found.`);
        return;
    }

    // Get next issue number
    const issueCount = await prisma.pmIssue.count({ where: { projectId: project.id } });
    const newKey = `${projectKey}-${issueCount + 1}`;

    const issue = await prisma.pmIssue.create({
        data: {
            key: newKey,
            title: subject.replace(/^(Re:|Fwd:)\s*/i, "").trim(),
            description: `📧 **Created from email** by \`${from}\`:\n\n${body}`,
            status: "TODO",
            priority: "MEDIUM",
            projectId: project.id,
            creatorId: from // use sender email as best-effort creatorId placeholder
        }
    });

    await auditLog({
        userId: from,
        action: "EMAIL_CREATE",
        entityType: "PmIssue",
        entityId: issue.id,
        details: { from, subject, key: newKey }
    });

    console.log(`[EmailSync] Created issue ${newKey} from email by ${from}`);
}

export async function startEmailSyncWorker(): Promise<void> {
    await queueService.connect();
    await queueService.subscribe<EmailSyncPayload>(QUEUES.EMAIL_SYNC, processEmail);
    console.log("[EmailSync] Worker started, listening on", QUEUES.EMAIL_SYNC);
}

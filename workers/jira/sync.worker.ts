import prisma from "../../lib/prisma";
/**
 * Jira Sync Worker
 * Pulls issues from Jira REST API and upserts them into Friday PM via Prisma.
 * Triggered by RabbitMQ message: { projectId, jiraProjectKey, accessToken }
 */
import { queueService, QUEUES } from "../shared/queues";
import {  PmIssueStatus, PmIssuePriority } from "@prisma/client";



interface JiraSyncPayload {
    projectId: string;        // Friday PM project ID
    jiraProjectKey: string;   // e.g. ENG
    jiraBaseUrl: string;      // e.g. https://mycompany.atlassian.net
    accessToken: string;      // OAuth2 access token
}

interface JiraIssue {
    key: string;
    fields: {
        summary: string;
        description?: { content?: unknown[] };
        status: { name: string };
        priority: { name: string };
        story_points?: number;
        assignee?: { emailAddress?: string };
        creator?: { emailAddress?: string };
    };
}

function mapJiraStatus(status: string): PmIssueStatus {
    const s = status.toLowerCase();
    if (s.includes("done") || s.includes("closed") || s.includes("resolved")) return PmIssueStatus.DONE;
    if (s.includes("in progress") || s.includes("in-progress")) return PmIssueStatus.IN_PROGRESS;
    if (s.includes("review")) return PmIssueStatus.IN_REVIEW;
    if (s.includes("backlog")) return PmIssueStatus.BACKLOG;
    return PmIssueStatus.TODO;
}

function mapJiraPriority(priority: string): PmIssuePriority {
    const p = priority.toLowerCase();
    if (p.includes("highest") || p.includes("critical")) return PmIssuePriority.URGENT;
    if (p.includes("high")) return PmIssuePriority.HIGH;
    if (p.includes("medium")) return PmIssuePriority.MEDIUM;
    if (p.includes("low")) return PmIssuePriority.LOW;
    return PmIssuePriority.NONE;
}

async function syncJiraProject(payload: JiraSyncPayload): Promise<void> {
    console.log(`[JiraSync] Starting sync for Jira project ${payload.jiraProjectKey}`);

    const { projectId, jiraProjectKey, jiraBaseUrl, accessToken } = payload;
    let startAt = 0;
    const maxResults = 100;

    // Find a system user to assign as creator (or create a bot user)
    const systemUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!systemUser) throw new Error("[JiraSync] No system user found for creator fallback");

    while (true) {
        const url = `${jiraBaseUrl}/rest/api/3/search?jql=project=${jiraProjectKey}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,status,priority,assignee,creator,story_points`;

        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
            },
        });

        if (!res.ok) {
            throw new Error(`[JiraSync] Jira API responded ${res.status}: ${await res.text()}`);
        }

        const data = await res.json() as { issues: JiraIssue[]; total: number; startAt: number };

        for (const issue of data.issues) {
            const key = `${jiraProjectKey}-${issue.key.split("-")[1]}`;
            await prisma.pmIssue.upsert({
                where: { key },
                create: {
                    key,
                    projectId,
                    title: issue.fields.summary,
                    status: mapJiraStatus(issue.fields.status.name),
                    priority: mapJiraPriority(issue.fields.priority?.name ?? ""),
                    storyPoints: issue.fields.story_points,
                    creatorId: systemUser.id,
                },
                update: {
                    title: issue.fields.summary,
                    status: mapJiraStatus(issue.fields.status.name),
                    priority: mapJiraPriority(issue.fields.priority?.name ?? ""),
                },
            });
        }

        console.log(`[JiraSync] Synced ${data.issues.length} issues (${startAt + data.issues.length}/${data.total})`);
        startAt += data.issues.length;
        if (startAt >= data.total) break;
    }

    console.log(`[JiraSync] Sync complete for ${jiraProjectKey}`);
}

export async function startJiraSyncWorker(): Promise<void> {
    await queueService.connect();
    await queueService.subscribe<JiraSyncPayload>(QUEUES.JIRA_SYNC, syncJiraProject);
    console.log("[JiraSync] Worker started, listening on", QUEUES.JIRA_SYNC);
}

/**
 * Real Jira Import Implementation
 * 
 * Flow:
 * 1. Create a PmImportJob record (returns immediately)
 * 2. Run async background processing
 * 3. Poll job status via tRPC
 */

import { prisma } from "@/lib/prisma";
import { decryptAccessToken } from "../crypto";
import { PmIssueType, PmIssuePriority } from "@prisma/client";

interface JiraField {
    summary: string;
    description?: { content?: Array<{ content?: Array<{ text?: string }> }> } | string;
    status: { name: string };
    priority?: { name: string };
    issuetype?: { name: string };
    assignee?: { emailAddress?: string; displayName?: string } | null;
    comment?: { comments?: Array<{ body: string; author?: { displayName?: string }; created: string }> };
}

interface JiraIssue {
    id: string;
    key: string;
    fields: JiraField;
}

interface ImportOptions {
    projectId: string;
    workspaceId: string;
    jiraProjectKey: string;
    defaultAssigneeId?: string;
    maxIssues?: number;
}

// Map Jira status → FRIDAY status
function mapStatus(jiraStatus: string): string {
    const s = jiraStatus.toLowerCase();
    if (s.includes("done") || s.includes("closed") || s.includes("resolved")) return "DONE";
    if (s.includes("in progress") || s.includes("in review") || s.includes("testing")) return "IN_PROGRESS";
    if (s.includes("blocked")) return "BLOCKED";
    return "TODO";
}

// Map Jira priority → FRIDAY priority
function mapPriority(jiraPriority?: string): PmIssuePriority {
    const p = jiraPriority?.toLowerCase() ?? "";
    if (p === "blocker" || p === "critical") return PmIssuePriority.URGENT;
    if (p === "major" || p === "high") return PmIssuePriority.HIGH;
    if (p === "minor" || p === "medium") return PmIssuePriority.MEDIUM;
    if (p === "trivial" || p === "low") return PmIssuePriority.LOW;
    return PmIssuePriority.NONE;
}

// Map Jira issue type → FRIDAY type
function mapIssueType(jiraType?: string): PmIssueType {
    const t = jiraType?.toLowerCase() ?? "";
    if (t.includes("epic")) return PmIssueType.EPIC;
    if (t.includes("story")) return PmIssueType.STORY;
    if (t.includes("bug")) return PmIssueType.BUG;
    if (t.includes("test")) return PmIssueType.TEST;
    if (t.includes("sub-task") || t.includes("subtask")) return PmIssueType.SUBTASK;
    return PmIssueType.TASK;
}

// Normalize Jira description (ADF or plain text)
function extractDescription(desc: JiraField["description"]): string {
    if (!desc) return "";
    if (typeof desc === "string") return desc;
    // Atlassian Document Format
    return desc.content
        ?.flatMap(block => block.content?.map(inline => inline.text ?? "") ?? [])
        .join("\n") ?? "";
}

// Fetch one page of issues from Jira REST API v3
async function fetchJiraIssues(
    domain: string,
    token: string,
    projectKey: string,
    startAt = 0,
    maxResults = 50
): Promise<{ issues: JiraIssue[]; total: number }> {
    const jql = encodeURIComponent(`project = ${projectKey} ORDER BY created ASC`);
    const url = `https://${domain}/rest/api/3/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,status,priority,issuetype,assignee,comment`;

    const headers = {
        Authorization: `Basic ${Buffer.from(`user:${token}`).toString("base64")}`,
        Accept: "application/json",
    };

    const res = await fetch(url, { headers });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Jira API error ${res.status}: ${text}`);
    }
    const data = await res.json() as { issues: JiraIssue[]; total: number };
    return { issues: data.issues ?? [], total: data.total ?? 0 };
}

// Resolve or create user by email
async function resolveAssigneeId(
    email: string | undefined,
    fallbackId: string | undefined
): Promise<string | null> {
    if (!email) return fallbackId ?? null;
    const user = await prisma.user.findFirst({ where: { email } });
    return user?.id ?? fallbackId ?? null;
}

// Main import function — runs async, updates PmImportJob progress
export async function runJiraImport(jobId: string, options: ImportOptions & { domain: string; token: string }): Promise<void> {
    const { projectId, workspaceId, domain, token, jiraProjectKey, defaultAssigneeId, maxIssues = 500 } = options;

    // Find the FRIDAY project to ensure it exists and get a valid creatorId
    const project = await prisma.pmProject.findUnique({
        where: { id: projectId },
        include: { members: { take: 1, include: { user: true } } }
    });
    if (!project) throw new Error("Project not found");

    const systemCreatorId = project.members[0]?.userId ?? defaultAssigneeId;
    if (!systemCreatorId) throw new Error("No users found in project to use as creator");

    // Mark job as running
    await prisma.pmImportJob.update({
        where: { id: jobId },
        data: { status: "RUNNING", startedAt: new Date() }
    });

    try {
        // Count total issues
        const { total } = await fetchJiraIssues(domain, token, jiraProjectKey, 0, 1);
        const limit = Math.min(total, maxIssues);
        await prisma.pmImportJob.update({ where: { id: jobId }, data: { total: limit } });

        let startAt = 0;
        let importedCount = 0;
        const PAGE_SIZE = 50;

        while (startAt < limit) {
            const { issues } = await fetchJiraIssues(domain, token, jiraProjectKey, startAt, PAGE_SIZE);
            if (issues.length === 0) break;

            for (const jIssue of issues) {
                // Generate a unique FRIDAY key
                const keyCount = await prisma.pmIssue.count({ where: { projectId } });
                const fridayKey = `${project.key}-${keyCount + 1}`;

                const assigneeId = await resolveAssigneeId(
                    jIssue.fields.assignee?.emailAddress,
                    defaultAssigneeId
                );

                await prisma.pmIssue.create({
                    data: {
                        key: fridayKey,
                        title: jIssue.fields.summary,
                        description: extractDescription(jIssue.fields.description),
                        status: mapStatus(jIssue.fields.status.name),
                        priority: mapPriority(jIssue.fields.priority?.name),
                        type: mapIssueType(jIssue.fields.issuetype?.name),
                        projectId,
                        workspaceId,
                        creatorId: systemCreatorId,
                        assigneeId: assigneeId ?? undefined,
                        customFields: { jiraKey: jIssue.key, jiraId: jIssue.id } as any,
                    },
                });

                importedCount++;
            }

            startAt += PAGE_SIZE;
            // Update progress
            const progress = Math.round((importedCount / limit) * 100);
            await prisma.pmImportJob.update({
                where: { id: jobId },
                data: { progress, importedCount }
            });
        }

        // Mark completed
        await prisma.pmImportJob.update({
            where: { id: jobId },
            data: { status: "COMPLETED", progress: 100, completedAt: new Date() }
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.pmImportJob.update({
            where: { id: jobId },
            data: { status: "FAILED", error: message, completedAt: new Date() }
        });
        throw err;
    }
}

// Quick import that creates a job record and kicks off async processing
export async function importFromJira(integrationId: string, mapping: {
    projectId: string;
    workspaceId: string;
    jiraProjectKey?: string;
    defaultAssigneeId?: string;
}) {
    const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration || integration.provider !== "jira") {
        throw new Error("Invalid Jira integration");
    }

    const token = decryptAccessToken(integration.accessToken);
    const meta = integration.metadata as Record<string, string> | null;
    const domain = meta?.domain ?? "";
    const jiraProjectKey = mapping.jiraProjectKey ?? meta?.projectKey ?? "";

    if (!domain || !jiraProjectKey) {
        throw new Error("Jira domain and project key are required. Set them in your integration metadata.");
    }

    // Create job record
    const job = await prisma.pmImportJob.create({
        data: {
            workspaceId: mapping.workspaceId,
            projectId: mapping.projectId,
            source: "jira",
            status: "PENDING",
            metadata: { integrationId, domain, jiraProjectKey } as any,
        }
    });

    // Kick off async — in production this would be a queue worker
    // For MVP, use setImmediate to not block the response
    setImmediate(() => {
        runJiraImport(job.id, {
            ...mapping,
            jiraProjectKey,
            domain,
            token,
        }).catch(console.error);
    });

    return {
        jobId: job.id,
        status: "PENDING" as const,
        message: "Import started. Poll /api/trpc/pmIntegrations.importJobStatus for progress.",
    };
}

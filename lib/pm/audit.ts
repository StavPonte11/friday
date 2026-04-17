import { prisma } from "@/lib/prisma";

export interface AuditOptions {
    workspaceId?: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
}

/**
 * Record an audit log entry.
 * Swallows errors to ensure audit logging never breaks the main flow.
 */
export async function recordAudit(opts: AuditOptions): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                workspaceId: opts.workspaceId,
                userId: opts.userId,
                action: opts.action,
                entityType: opts.entityType,
                entityId: opts.entityId,
                details: opts.details ? (opts.details as any) : undefined,
            }
        });
    } catch (err) {
        console.error("[audit] Failed to record audit log:", err);
    }
}

/**
 * Convenience wrappers for common actions.
 */
export const audit = {
    issueCreated: (workspaceId: string, userId: string, issueId: string, issueKey: string) =>
        recordAudit({ workspaceId, userId, action: "issue.created", entityType: "PmIssue", entityId: issueId, details: { issueKey } }),

    issueDeleted: (workspaceId: string, userId: string, issueId: string, issueKey: string) =>
        recordAudit({ workspaceId, userId, action: "issue.deleted", entityType: "PmIssue", entityId: issueId, details: { issueKey } }),

    issueUpdated: (workspaceId: string, userId: string, issueId: string, fields: string[]) =>
        recordAudit({ workspaceId, userId, action: "issue.updated", entityType: "PmIssue", entityId: issueId, details: { fields } }),

    projectCreated: (workspaceId: string, userId: string, projectId: string, projectKey: string) =>
        recordAudit({ workspaceId, userId, action: "project.created", entityType: "PmProject", entityId: projectId, details: { projectKey } }),

    projectDeleted: (workspaceId: string, userId: string, projectId: string, projectKey: string) =>
        recordAudit({ workspaceId, userId, action: "project.deleted", entityType: "PmProject", entityId: projectId, details: { projectKey } }),

    memberAdded: (workspaceId: string, userId: string, projectId: string, targetUserId: string) =>
        recordAudit({ workspaceId, userId, action: "project.member.added", entityType: "PmProjectMember", entityId: projectId, details: { targetUserId } }),

    memberRemoved: (workspaceId: string, userId: string, projectId: string, targetUserId: string) =>
        recordAudit({ workspaceId, userId, action: "project.member.removed", entityType: "PmProjectMember", entityId: projectId, details: { targetUserId } }),
};

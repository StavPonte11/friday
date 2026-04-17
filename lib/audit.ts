import { prisma } from "@/lib/prisma";

export async function auditLog(params: {
    workspaceId?: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                workspaceId: params.workspaceId,
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                details: params.details || {}
            }
        });
    } catch (error) {
        console.error("[AuditLog Error] Failed to write audit log:", error);
    }
}

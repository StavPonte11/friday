import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import type { WorkspaceRole } from "@prisma/client";

// Role hierarchy: OWNER > ADMIN > MEMBER > VIEWER
const ROLE_RANK: Record<WorkspaceRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
};

/**
 * Throws FORBIDDEN if the session user does not have at least `minRole`
 * in the given workspace. Also throws NOT_FOUND if the workspace or
 * membership doesn't exist.
 *
 * @example
 *   await requireRole(ctx, input.workspaceId, "MEMBER");
 */
export async function requireRole(
    ctx: { session: { user: { id: string } } },
    workspaceId: string,
    minRole: WorkspaceRole,
): Promise<void> {
    const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: ctx.session.user.id } },
        select: { role: true },
    });

    if (!membership) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not a member of this workspace",
        });
    }

    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: `This action requires the ${minRole} role or higher`,
        });
    }
}

/**
 * Returns the user's role in the workspace, or null if not a member.
 */
export async function getUserRole(
    userId: string,
    workspaceId: string,
): Promise<WorkspaceRole | null> {
    const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        select: { role: true },
    });
    return membership?.role ?? null;
}

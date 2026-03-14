import { prisma } from "@/lib/prisma";
import { PmProjectRole } from "@prisma/client";

// ─── Permission definitions ───────────────────────────────────────────────────
export type PmPermission =
    | "CREATE_ISSUE"
    | "EDIT_ISSUE"
    | "DELETE_ISSUE"
    | "MANAGE_SPRINTS"
    | "VIEW_REPORTS"
    | "MANAGE_USERS"
    | "MANAGE_PROJECT"
    | "COMMENT_ISSUE"
    | "UPLOAD_ATTACHMENT"
    | "MANAGE_WEBHOOKS"
    | "VIEW_ISSUES";

// Role → allowed permissions map
const ROLE_PERMISSIONS: Record<PmProjectRole, PmPermission[]> = {
    [PmProjectRole.PROJECT_ADMIN]: [
        "CREATE_ISSUE", "EDIT_ISSUE", "DELETE_ISSUE", "MANAGE_SPRINTS",
        "VIEW_REPORTS", "MANAGE_USERS", "MANAGE_PROJECT", "COMMENT_ISSUE",
        "UPLOAD_ATTACHMENT", "MANAGE_WEBHOOKS", "VIEW_ISSUES"
    ],
    [PmProjectRole.TEAM_LEADER]: [
        "CREATE_ISSUE", "EDIT_ISSUE", "DELETE_ISSUE", "MANAGE_SPRINTS",
        "VIEW_REPORTS", "COMMENT_ISSUE", "UPLOAD_ATTACHMENT", "VIEW_ISSUES"
    ],
    [PmProjectRole.DEVELOPER]: [
        "CREATE_ISSUE", "EDIT_ISSUE", "COMMENT_ISSUE", "UPLOAD_ATTACHMENT", "VIEW_ISSUES"
    ],
    [PmProjectRole.VIEWER]: [
        "VIEW_ISSUES", "COMMENT_ISSUE"
    ],
};

// ─── Core RBAC functions ──────────────────────────────────────────────────────

/**
 * Check if a user has a specific permission in a project.
 * Returns false if the user is not a member of the project.
 */
export async function checkPermission(
    userId: string,
    projectId: string,
    permission: PmPermission
): Promise<boolean> {
    const member = await prisma.pmProjectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { role: true }
    });

    if (!member) return false;
    return ROLE_PERMISSIONS[member.role].includes(permission);
}

/**
 * Assert a user has a permission, throwing a typed error if not.
 */
export async function assertPermission(
    userId: string,
    projectId: string,
    permission: PmPermission
): Promise<void> {
    const allowed = await checkPermission(userId, projectId, permission);
    if (!allowed) {
        throw new Error(`FORBIDDEN: You do not have '${permission}' permission in this project.`);
    }
}

/**
 * Get a user's role in a project, or null if not a member.
 */
export async function getProjectRole(
    userId: string,
    projectId: string
): Promise<PmProjectRole | null> {
    const member = await prisma.pmProjectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { role: true }
    });
    return member?.role ?? null;
}

/**
 * List projects a user has access to.
 * Workspace ADMINs/OWNERs see all projects in the workspace.
 */
export async function getAccessibleProjects(userId: string, workspaceId?: string) {
    // Check workspace-level admin
    const workspaceQuery = workspaceId ? { workspaceId } : {};
    const wsAdmin = workspaceId
        ? await prisma.workspaceMember.findFirst({
            where: { userId, workspaceId, role: { in: ["OWNER", "ADMIN"] } }
        })
        : null;

    if (wsAdmin) {
        return prisma.pmProject.findMany({
            where: { ...workspaceQuery },
            include: { _count: { select: { issues: true, sprints: true } } },
            orderBy: { updatedAt: "desc" }
        });
    }

    // Regular user: only projects they are a member of
    return prisma.pmProject.findMany({
        where: {
            ...workspaceQuery,
            members: { some: { userId } }
        },
        include: { _count: { select: { issues: true, sprints: true } } },
        orderBy: { updatedAt: "desc" }
    });
}

/**
 * Auto-add a user as PROJECT_ADMIN when they create a project.
 */
export async function addProjectCreatorAsAdmin(
    userId: string,
    projectId: string
): Promise<void> {
    await prisma.pmProjectMember.upsert({
        where: { projectId_userId: { projectId, userId } },
        create: { projectId, userId, role: PmProjectRole.PROJECT_ADMIN },
        update: { role: PmProjectRole.PROJECT_ADMIN }
    });
}

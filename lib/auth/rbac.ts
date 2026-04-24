import { prisma } from "@/lib/prisma";
import type { SessionUser } from "./session";

// ---------------------------------------------------------------------------
// Permission types
// ---------------------------------------------------------------------------
export type Permission =
  | "board:view"
  | "board:edit"
  | "user:manage"
  | "group:manage"
  | "workspace:settings";

// ---------------------------------------------------------------------------
// Role → default global permissions
// ---------------------------------------------------------------------------
const ROLE_PERMISSIONS: Record<SessionUser["role"], Permission[]> = {
  OWNER: ["board:view", "board:edit", "user:manage", "group:manage", "workspace:settings"],
  ADMIN: ["board:view", "board:edit", "user:manage", "group:manage"],
  MEMBER: ["board:view"],
  VIEWER: ["board:view"],
};

/**
 * Check if a user has a given permission.
 *
 * Resolution order:
 * 1. Role-based global permissions (OWNER/ADMIN get edit everywhere)
 * 2. PmBoardAccess — direct user grant on a specific project
 * 3. PmBoardAccess — group grant (if user is member of granted group)
 *
 * @param userId   The user whose permissions to evaluate
 * @param permission  The permission to check
 * @param context  Optional context for resource-scoped checks (projectId)
 */
export async function checkPermission(
  userId: string,
  permission: Permission,
  context: { projectId?: string } = {}
): Promise<boolean> {
  // 1. Fetch user's workspace membership to determine role
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const role = (membership?.role ?? "VIEWER") as SessionUser["role"];

  // 2. Check global role permissions
  if (ROLE_PERMISSIONS[role].includes(permission)) {
    return true;
  }

  // 3. Resource-scoped check for board:view / board:edit
  if (context.projectId && (permission === "board:view" || permission === "board:edit")) {
    return checkBoardAccess(userId, context.projectId, permission);
  }

  return false;
}

/**
 * Checks if user can access a board directly or via group membership.
 */
export async function checkBoardAccess(
  userId: string,
  projectId: string,
  permission: "board:view" | "board:edit"
): Promise<boolean> {
  const requiredRole = permission === "board:edit" ? "EDITOR" : "VIEWER";

  // Direct user grant
  const directGrant = await prisma.pmBoardAccess.findFirst({
    where: {
      projectId,
      entityType: "USER",
      entityId: userId,
      ...(requiredRole === "EDITOR" ? { role: "EDITOR" } : {}),
    },
  });

  if (directGrant) return true;

  // Group grant — check if user is in any group that has access
  const userGroups = await prisma.workspaceGroupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });

  if (userGroups.length === 0) return false;

  const groupIds = userGroups.map((m) => m.groupId);

  const groupGrant = await prisma.pmBoardAccess.findFirst({
    where: {
      projectId,
      entityType: "GROUP",
      entityId: { in: groupIds },
      ...(requiredRole === "EDITOR" ? { role: "EDITOR" } : {}),
    },
  });

  return !!groupGrant;
}

/**
 * Returns all direct + group-inherited access roles for a user on a project.
 * Used to build the ShareModal access list UI.
 */
export async function getUserBoardRole(
  userId: string,
  projectId: string
): Promise<"EDITOR" | "VIEWER" | null> {
  const directGrant = await prisma.pmBoardAccess.findFirst({
    where: { projectId, entityType: "USER", entityId: userId },
  });

  if (directGrant) return directGrant.role;

  const userGroups = await prisma.workspaceGroupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });

  if (userGroups.length === 0) return null;

  const groupIds = userGroups.map((m) => m.groupId);
  const groupGrant = await prisma.pmBoardAccess.findFirst({
    where: { projectId, entityType: "GROUP", entityId: { in: groupIds } },
    orderBy: { role: "desc" }, // EDITOR > VIEWER lexically
  });

  return groupGrant?.role ?? null;
}

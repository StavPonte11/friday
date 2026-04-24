import { TRPCError } from "@trpc/server";
import type { SessionUser } from "./session";

// ---------------------------------------------------------------------------
// Role hierarchy — higher index = more privileged
// ---------------------------------------------------------------------------
const ROLE_ORDER: SessionUser["role"][] = ["VIEWER", "MEMBER", "ADMIN", "OWNER"];

function roleIndex(role: SessionUser["role"]): number {
  return ROLE_ORDER.indexOf(role);
}

// ---------------------------------------------------------------------------
// tRPC-compatible guards (throw TRPCError)
// ---------------------------------------------------------------------------

/**
 * Asserts that a session user exists in context.
 * Use inside tRPC procedures that already have ctx typed.
 */
export function requireAuth(user: SessionUser | null | undefined): asserts user is SessionUser {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in." });
  }
  if (!(user as SessionUser).id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid session." });
  }
}

/**
 * Asserts that the current user has at least the required workspace role.
 * e.g. requireRole(user, "ADMIN") passes for ADMIN and OWNER.
 */
export function requireRole(
  user: SessionUser | null | undefined,
  minimumRole: SessionUser["role"]
): asserts user is SessionUser {
  requireAuth(user);
  if (roleIndex(user.role) < roleIndex(minimumRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Requires role ${minimumRole} or higher. Your role: ${user.role}`,
    });
  }
}

/**
 * Asserts the user is active (has not been deactivated).
 */
export function requireActive(user: SessionUser | null | undefined): asserts user is SessionUser {
  requireAuth(user);
}

/**
 * Returns true if user has at least the specified role.
 */
export function hasRole(user: SessionUser, minimumRole: SessionUser["role"]): boolean {
  return roleIndex(user.role) >= roleIndex(minimumRole);
}

/**
 * Returns true if user is workspace admin or owner.
 */
export function isWorkspaceAdmin(user: SessionUser): boolean {
  return hasRole(user, "ADMIN");
}

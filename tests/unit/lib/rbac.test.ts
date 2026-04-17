/**
 * Unit tests for lib/pm/rbac.ts
 * Uses vi.mock to avoid hitting a real DB.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock prisma ─────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
    prisma: {
        pmProjectMember: {
            findUnique: vi.fn(),
            upsert: vi.fn(),
        },
        workspaceMember: {
            findFirst: vi.fn(),
        },
        pmProject: {
            findMany: vi.fn(),
        },
    },
}));

import { prisma } from "@/lib/prisma";
import {
    checkPermission,
    assertPermission,
    getProjectRole,
} from "@/lib/pm/rbac";
import { PmProjectRole } from "@prisma/client";

const findUnique = prisma.pmProjectMember.findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

// ─── checkPermission ──────────────────────────────────────────────────────────
describe("checkPermission", () => {
    it("returns false when user is not a project member", async () => {
        findUnique.mockResolvedValue(null);
        const result = await checkPermission("user-1", "proj-1", "CREATE_ISSUE");
        expect(result).toBe(false);
    });

    it("returns true for PROJECT_ADMIN with any permission", async () => {
        findUnique.mockResolvedValue({ role: PmProjectRole.PROJECT_ADMIN });
        const perms = [
            "CREATE_ISSUE", "EDIT_ISSUE", "DELETE_ISSUE", "MANAGE_SPRINTS",
            "VIEW_REPORTS", "MANAGE_USERS", "MANAGE_PROJECT",
        ] as const;
        for (const perm of perms) {
            const result = await checkPermission("user-1", "proj-1", perm);
            expect(result, `PROJECT_ADMIN should have ${perm}`).toBe(true);
        }
    });

    it("returns true for DEVELOPER with allowed permissions", async () => {
        findUnique.mockResolvedValue({ role: PmProjectRole.DEVELOPER });
        expect(await checkPermission("user-1", "proj-1", "CREATE_ISSUE")).toBe(true);
        expect(await checkPermission("user-1", "proj-1", "COMMENT_ISSUE")).toBe(true);
        expect(await checkPermission("user-1", "proj-1", "VIEW_ISSUES")).toBe(true);
    });

    it("returns false for DEVELOPER trying to manage sprints", async () => {
        findUnique.mockResolvedValue({ role: PmProjectRole.DEVELOPER });
        expect(await checkPermission("user-1", "proj-1", "MANAGE_SPRINTS")).toBe(false);
    });

    it("returns false for DEVELOPER trying to manage webhooks", async () => {
        findUnique.mockResolvedValue({ role: PmProjectRole.DEVELOPER });
        expect(await checkPermission("user-1", "proj-1", "MANAGE_WEBHOOKS")).toBe(false);
    });

    it("VIEWER can view issues and comment but cannot create", async () => {
        findUnique.mockResolvedValue({ role: PmProjectRole.VIEWER });
        expect(await checkPermission("user-1", "proj-1", "VIEW_ISSUES")).toBe(true);
        expect(await checkPermission("user-1", "proj-1", "COMMENT_ISSUE")).toBe(true);
        expect(await checkPermission("user-1", "proj-1", "CREATE_ISSUE")).toBe(false);
        expect(await checkPermission("user-1", "proj-1", "DELETE_ISSUE")).toBe(false);
    });

    it("TEAM_LEADER can manage sprints but not webhooks", async () => {
        findUnique.mockResolvedValue({ role: PmProjectRole.TEAM_LEADER });
        expect(await checkPermission("user-1", "proj-1", "MANAGE_SPRINTS")).toBe(true);
        expect(await checkPermission("user-1", "proj-1", "MANAGE_WEBHOOKS")).toBe(false);
    });
});

// ─── assertPermission ─────────────────────────────────────────────────────────
describe("assertPermission", () => {
    it("does not throw when user has the permission", async () => {
        findUnique.mockResolvedValue({ role: PmProjectRole.DEVELOPER });
        await expect(assertPermission("user-1", "proj-1", "CREATE_ISSUE")).resolves.toBeUndefined();
    });

    it("throws FORBIDDEN error when user lacks permission", async () => {
        findUnique.mockResolvedValue({ role: PmProjectRole.VIEWER });
        await expect(assertPermission("user-1", "proj-1", "CREATE_ISSUE")).rejects.toThrow(/FORBIDDEN/);
    });

    it("throws FORBIDDEN error when user is not a member", async () => {
        findUnique.mockResolvedValue(null);
        await expect(assertPermission("user-1", "proj-1", "VIEW_ISSUES")).rejects.toThrow(/FORBIDDEN/);
    });
});

// ─── getProjectRole ───────────────────────────────────────────────────────────
describe("getProjectRole", () => {
    it("returns null when user is not a member", async () => {
        findUnique.mockResolvedValue(null);
        expect(await getProjectRole("user-1", "proj-1")).toBeNull();
    });

    it("returns the member's role", async () => {
        findUnique.mockResolvedValue({ role: PmProjectRole.TEAM_LEADER });
        expect(await getProjectRole("user-1", "proj-1")).toBe(PmProjectRole.TEAM_LEADER);
    });
});

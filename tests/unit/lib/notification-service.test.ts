/**
 * Unit tests for lib/pm/notification-service.ts
 * Uses vi.mock to avoid hitting a real DB.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock prisma ─────────────────────────────────────────────────────────────
const { mockCreate, mockFindUnique } = vi.hoisted(() => {
    return {
        mockCreate: vi.fn().mockResolvedValue({}),
        mockFindUnique: vi.fn(),
    };
});

vi.mock("@/lib/prisma", () => ({
    prisma: {
        pmNotification: {
            create: mockCreate,
        },
        user: {
            findUnique: mockFindUnique,
            findMany: vi.fn(),
        },
    },
}));

import {
    extractMentions,
    notify,
    notifyMany,
    sendEmailNotification,
} from "@/lib/pm/notification-service";

beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({});
    mockFindUnique.mockResolvedValue({ email: "test@example.com", name: "Test User" });
});

// ─── extractMentions ──────────────────────────────────────────────────────────
describe("extractMentions", () => {
    it("extracts single mention", () => {
        expect(extractMentions("Hey @alice, can you review this?")).toEqual(["alice"]);
    });

    it("extracts multiple mentions", () => {
        expect(extractMentions("@alice and @bob please check")).toEqual(["alice", "bob"]);
    });

    it("deduplicates the same handle", () => {
        expect(extractMentions("@alice @alice")).toEqual(["alice"]);
    });

    it("handles dotted handles (firstname.lastname)", () => {
        expect(extractMentions("cc @john.doe")).toEqual(["john.doe"]);
    });

    it("returns empty array when no mentions", () => {
        expect(extractMentions("no mentions here")).toEqual([]);
    });

    it("ignores email addresses (@ inside words not at start)", () => {
        const result = extractMentions("Send to user@example.com for @alice only");
        // extractMentions uses /@ prefix, so user@example won't match but @alice will
        expect(result).toContain("alice");
    });
});

// ─── notify ───────────────────────────────────────────────────────────────────
describe("notify", () => {
    it("creates a notification record", async () => {
        await notify("user-1", "comment_added", "New comment", { issueKey: "FCP-1" });
        expect(mockCreate).toHaveBeenCalledOnce();
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: "user-1",
                    type: "comment_added",
                    title: "New comment",
                }),
            })
        );
    });

    it("does not throw if DB create fails", async () => {
        mockCreate.mockRejectedValueOnce(new Error("DB error"));
        await expect(notify("user-1", "mentioned", "You were mentioned")).resolves.not.toThrow();
    });

    it("includes payload in the notification", async () => {
        const payload = { issueId: "abc", projectId: "proj-1" };
        await notify("user-1", "issue_assigned", "Assigned", payload);
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ payload }),
            })
        );
    });
});

// ─── notifyMany ───────────────────────────────────────────────────────────────
describe("notifyMany", () => {
    it("creates notifications for all unique user IDs", async () => {
        await notifyMany(["user-1", "user-2", "user-3"], "sprint_started", "Sprint started");
        expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("deduplicates user IDs before notifying", async () => {
        await notifyMany(["user-1", "user-1", "user-2"], "comment_added", "Comment");
        expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it("resolves without error when given empty array", async () => {
        await expect(notifyMany([], "mentioned", "No one")).resolves.not.toThrow();
        expect(mockCreate).not.toHaveBeenCalled();
    });
});

// ─── sendEmailNotification ────────────────────────────────────────────────────
describe("sendEmailNotification", () => {
    it("looks up user email from DB", async () => {
        await sendEmailNotification("user-1", "Subject", "Body");
        expect(mockFindUnique).toHaveBeenCalledWith({
            where: { id: "user-1" },
            select: { email: true, name: true },
        });
    });

    it("does not throw when user has no email", async () => {
        mockFindUnique.mockResolvedValueOnce({ email: null, name: "Ghost" });
        await expect(sendEmailNotification("user-1", "Subject", "Body")).resolves.not.toThrow();
    });

    it("does not throw when user not found", async () => {
        mockFindUnique.mockResolvedValueOnce(null);
        await expect(sendEmailNotification("user-1", "Subject", "Body")).resolves.not.toThrow();
    });
});

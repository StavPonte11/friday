import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { PmIssueType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// ─── Valid hierarchy rules ────────────────────────────────────────────────────
const HIERARCHY_RULES: Record<PmIssueType, PmIssueType[]> = {
    INITIATIVE: ["EPIC"],
    EPIC:        ["FEATURE"],
    FEATURE:     ["STORY", "TASK", "BUG", "TEST"],
    STORY:       ["TASK", "SUBTASK"],
    TASK:        ["SUBTASK"],
    SUBTASK:     [],
    BUG:         ["SUBTASK"],
    TEST:        [],
};

function isValidParent(parentType: PmIssueType, childType: PmIssueType): boolean {
    return HIERARCHY_RULES[parentType]?.includes(childType) ?? false;
}

// ─── Tree builder helper ──────────────────────────────────────────────────────
type HierarchyNode = {
    id: string;
    key: string;
    title: string;
    type: PmIssueType;
    status: string;
    priority: string;
    assigneeId: string | null;
    children: HierarchyNode[];
    depth: number;
    childCount: number;
};

function buildTree(
    issues: Array<{ id: string; key: string; title: string; type: PmIssueType; status: string; priority: string; assigneeId: string | null; parentId: string | null }>,
    parentId: string | null = null,
    depth = 0
): HierarchyNode[] {
    return issues
        .filter(i => i.parentId === parentId)
        .map(i => {
            const children = buildTree(issues, i.id, depth + 1);
            return {
                ...i,
                children,
                depth,
                childCount: children.length,
            };
        });
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const pmHierarchyRouter = router({
    /** Returns the full hierarchy tree for a project */
    tree: publicProcedure
        .input(z.object({
            projectId: z.string(),
            rootType: z.nativeEnum(PmIssueType).optional(), // filter top-level: EPIC or INITIATIVE
        }))
        .query(async ({ input }) => {
            const issues = await prisma.pmIssue.findMany({
                where: { projectId: input.projectId, deletedAt: null },
                select: {
                    id: true,
                    key: true,
                    title: true,
                    type: true,
                    status: true,
                    priority: true,
                    assigneeId: true,
                    parentId: true,
                    storyPoints: true,
                },
                orderBy: [{ type: "asc" }, { createdAt: "asc" }],
            });

            const rootTypes: PmIssueType[] = input.rootType
                ? [input.rootType]
                : ["INITIATIVE", "EPIC", "FEATURE"];

            // Top-level items (no parent OR parent is not in this project)
            const issueIds = new Set(issues.map(i => i.id));
            const roots = issues.filter(
                i => !i.parentId || !issueIds.has(i.parentId)
            );

            return buildTree(
                issues as any,
                null
            );
        }),

    /** Validate and enforce parent-child type rules */
    validateParent: publicProcedure
        .input(z.object({
            parentId: z.string(),
            childType: z.nativeEnum(PmIssueType),
        }))
        .query(async ({ input }) => {
            const parent = await prisma.pmIssue.findUnique({
                where: { id: input.parentId },
                select: { id: true, type: true, title: true },
            });
            if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent issue not found" });

            const valid = isValidParent(parent.type, input.childType);
            const allowedChildTypes = HIERARCHY_RULES[parent.type] ?? [];

            return {
                valid,
                parentType: parent.type,
                allowedChildTypes,
                message: valid
                    ? `✅ ${input.childType} can be a child of ${parent.type}`
                    : `❌ ${input.childType} cannot be a child of ${parent.type}. Allowed: ${allowedChildTypes.join(", ")}`,
            };
        }),

    /** Move issue to a different parent (with hierarchy validation) */
    reparent: publicProcedure
        .input(z.object({
            issueId: z.string(),
            newParentId: z.string().nullable(),
        }))
        .mutation(async ({ input }) => {
            const issue = await prisma.pmIssue.findUnique({
                where: { id: input.issueId },
                select: { id: true, type: true },
            });
            if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });

            if (input.newParentId) {
                const parent = await prisma.pmIssue.findUnique({
                    where: { id: input.newParentId },
                    select: { id: true, type: true },
                });
                if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent not found" });
                if (!isValidParent(parent.type, issue.type)) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: `Cannot move ${issue.type} under ${parent.type}. Allowed children: ${HIERARCHY_RULES[parent.type].join(", ")}`,
                    });
                }
            }

            return prisma.pmIssue.update({
                where: { id: input.issueId },
                data: { parentId: input.newParentId },
            });
        }),

    /** Returns allowed child types for a given parent type */
    allowedChildTypes: publicProcedure
        .input(z.object({ parentType: z.nativeEnum(PmIssueType) }))
        .query(({ input }) => {
            return {
                parentType: input.parentType,
                allowedChildTypes: HIERARCHY_RULES[input.parentType] ?? [],
            };
        }),

    /** Summary stats per hierarchy level for a project */
    stats: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            const groups = await prisma.pmIssue.groupBy({
                by: ["type"],
                where: { projectId: input.projectId, deletedAt: null },
                _count: { _all: true },
            });

            return groups.map(g => ({
                type: g.type,
                count: g._count._all,
            }));
        }),
});

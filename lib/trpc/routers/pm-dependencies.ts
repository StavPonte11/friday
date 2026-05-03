import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

// Uses the existing PmIssueLink model with PmLinkType enum:
//   BLOCKS, IS_BLOCKED_BY, RELATES_TO, DUPLICATES

export const pmDependenciesRouter = router({
    /** List all dependency links for an issue */
    list: protectedProcedure
        .input(z.object({ issueId: z.string() }))
        .query(async ({ input }) => {
            const [outbound, inbound] = await Promise.all([
                prisma.pmIssueLink.findMany({
                    where: { sourceIssueId: input.issueId },
                    include: { targetIssue: { select: { id: true, key: true, title: true, status: true } } },
                }),
                prisma.pmIssueLink.findMany({
                    where: { targetIssueId: input.issueId },
                    include: { sourceIssue: { select: { id: true, key: true, title: true, status: true } } },
                }),
            ]);

            return {
                blocks: outbound.filter(l => l.type === "BLOCKS").map(l => l.targetIssue),
                blockedBy: inbound.filter(l => l.type === "BLOCKS").map(l => l.sourceIssue),
                relatesTo: [
                    ...outbound.filter(l => l.type === "RELATES_TO").map(l => l.targetIssue),
                    ...inbound.filter(l => l.type === "RELATES_TO").map(l => l.sourceIssue),
                ],
                duplicates: outbound.filter(l => l.type === "DUPLICATES").map(l => l.targetIssue),
            };
        }),

    /** Add a dependency link between two issues */
    add: protectedProcedure
        .input(z.object({
            sourceIssueId: z.string(),
            targetIssueId: z.string(),
            type: z.enum(["BLOCKS", "IS_BLOCKED_BY", "RELATES_TO", "DUPLICATES"]),
        }))
        .mutation(async ({ input }) => {
            if (input.sourceIssueId === input.targetIssueId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "An issue cannot link to itself" });
            }

            // Normalize IS_BLOCKED_BY → store as BLOCKS from the other direction
            const { sourceIssueId, targetIssueId, type } = input.type === "IS_BLOCKED_BY"
                ? { sourceIssueId: input.targetIssueId, targetIssueId: input.sourceIssueId, type: "BLOCKS" as const }
                : input;

            return prisma.pmIssueLink.upsert({
                where: { sourceIssueId_targetIssueId_type: { sourceIssueId, targetIssueId, type } },
                create: { sourceIssueId, targetIssueId, type },
                update: {},
            });
        }),

    /** Remove a dependency link */
    remove: protectedProcedure
        .input(z.object({ linkId: z.string() }))
        .mutation(async ({ input }) => {
            await prisma.pmIssueLink.delete({ where: { id: input.linkId } });
            return { success: true };
        }),

    /**
     * Check if moving an issue to Done is blocked.
     * Returns { blocked: true, blockers: [...] } if any BLOCKS links
     * point to open issues.
     */
    checkBlocked: protectedProcedure
        .input(z.object({ issueId: z.string() }))
        .query(async ({ input }) => {
            const blockers = await prisma.pmIssueLink.findMany({
                where: {
                    targetIssueId: input.issueId,
                    type: "BLOCKS",
                    sourceIssue: {
                        status: { notIn: ["done", "cancelled"] }
                    }
                },
                include: {
                    sourceIssue: { select: { id: true, key: true, title: true, status: true } }
                },
            });

            return {
                blocked: blockers.length > 0,
                blockers: blockers.map(b => b.sourceIssue),
            };
        }),
});

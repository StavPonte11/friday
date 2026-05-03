import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { langfuse } from "@/lib/langfuse";

export const pmBulkRouter = router({
    /**
     * Bulk update multiple issues in one transaction.
     * Only non-null fields are applied so callers can patch a single field.
     */
    updateIssues: protectedProcedure
        .input(z.object({
            issueIds: z.array(z.string()).min(1).max(200),
            status: z.string().optional(),
            assigneeId: z.string().nullable().optional(),
            priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"]).optional(),
            labelIds: z.array(z.string()).optional(),   // replaces all labels
            sprintId: z.string().nullable().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const { issueIds, labelIds, ...scalarFields } = input;

            // Build scalar update data — only include defined fields
            const data: Record<string, unknown> = {};
            if (scalarFields.status !== undefined) data.status = scalarFields.status;
            if (scalarFields.assigneeId !== undefined) data.assigneeId = scalarFields.assigneeId;
            if (scalarFields.priority !== undefined) data.priority = scalarFields.priority;
            if (scalarFields.sprintId !== undefined) data.sprintId = scalarFields.sprintId;

            await prisma.$transaction(async (tx) => {
                if (Object.keys(data).length > 0) {
                    await tx.pmIssue.updateMany({
                        where: { id: { in: issueIds } },
                        data,
                    });
                }

                // Label replacement requires individual updates (many-to-many)
                if (labelIds !== undefined) {
                    await Promise.all(
                        issueIds.map(issueId =>
                            tx.pmIssue.update({
                                where: { id: issueId },
                                data: {
                                    labels: {
                                        set: labelIds.map(id => ({ id })),
                                    },
                                },
                            })
                        )
                    );
                }

                // Record activity for each issue
                if (Object.keys(data).length > 0 || labelIds !== undefined) {
                    await tx.pmIssueActivity.createMany({
                        data: issueIds.map(issueId => ({
                            issueId,
                            userId: ctx.session.user.id,
                            action: "bulk_updated",
                            details: { ...data, ...(labelIds ? { labelIds } : {}) },
                        })),
                        skipDuplicates: true,
                    });
                }
            });

            langfuse.trace({
                name: "pm.bulk.update",
                metadata: { count: issueIds.length, fields: Object.keys(data) },
            });

            return { updated: issueIds.length };
        }),

    /**
     * Bulk delete issues (ADMIN+ action).
     */
    deleteIssues: protectedProcedure
        .input(z.object({
            issueIds: z.array(z.string()).min(1).max(100),
            projectId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Verify all issues belong to the project
            const count = await prisma.pmIssue.count({
                where: { id: { in: input.issueIds }, projectId: input.projectId }
            });
            if (count !== input.issueIds.length) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Some issues don't belong to this project" });
            }

            await prisma.pmIssue.deleteMany({ where: { id: { in: input.issueIds } } });

            langfuse.trace({
                name: "pm.bulk.delete",
                metadata: { count: input.issueIds.length, projectId: input.projectId },
            });

            return { deleted: input.issueIds.length };
        }),

    /**
     * Bulk assign issues to a sprint.
     */
    assignSprint: protectedProcedure
        .input(z.object({
            issueIds: z.array(z.string()).min(1).max(200),
            sprintId: z.string().nullable(), // null = remove from sprint (backlog)
        }))
        .mutation(async ({ input }) => {
            await prisma.pmIssue.updateMany({
                where: { id: { in: input.issueIds } },
                data: { sprintId: input.sprintId },
            });
            return { updated: input.issueIds.length };
        }),
});

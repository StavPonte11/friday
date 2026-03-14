import { z } from "zod";
import { router, publicProcedure } from "../init";
import { PmIssue } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { langfuse } from "@/lib/langfuse";
import { generateSprintPlan } from "@/lib/ai/pm-sprint-planning";
import { dispatchWebhook } from "./pm-webhooks";


export const pmSprintsRouter = router({
    listByProject: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmSprint.findMany({
                where: { projectId: input.projectId },
                orderBy: { startDate: 'asc' },
                include: {
                    issues: true
                }
            });
        }),

    get: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmSprint.findUnique({
                where: { id: input.id },
                include: {
                    issues: true
                }
            });
        }),

    create: publicProcedure
        .input(z.object({
            projectId: z.string(),
            name: z.string().min(1),
            goal: z.string().optional().nullable(),
            startDate: z.date().optional().nullable(),
            endDate: z.date().optional().nullable(),
        }))
        .mutation(async ({ input }) => {
            return prisma.pmSprint.create({
                data: {
                    ...input,
                    status: "PLANNED"
                }
            });
        }),

    update: publicProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().optional(),
            goal: z.string().optional().nullable(),
            startDate: z.date().optional().nullable(),
            endDate: z.date().optional().nullable(),
            status: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, status, ...data } = input;
            
            // Prune undefined fields so Prisma doesn't overwrite with nulls
            const updateData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
            if (status !== undefined) {
                (updateData as any).status = status;
            }

            const updated = await prisma.pmSprint.update({
                where: { id },
                data: updateData
            });

            // Dispatch Webhook if status changed to ACTIVE or COMPLETED
            if (status === "ACTIVE" || status === "COMPLETED") {
                const event = status === "ACTIVE" ? "sprint.started" : "sprint.completed";
                await dispatchWebhook(updated.projectId, event, {
                    sprintId: updated.id,
                    sprintName: updated.name,
                    status: updated.status
                });
            }

            return updated;
        }),

    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            // Unassign issues from sprint before deleting
            await prisma.pmIssue.updateMany({
                where: { sprintId: input.id },
                data: { sprintId: null }
            });

            return prisma.pmSprint.delete({
                where: { id: input.id }
            });
        }),

    moveIssues: publicProcedure
        .input(z.object({
            sprintId: z.string().nullable(), // null means move to backlog
            issueIds: z.array(z.string())
        }))
        .mutation(async ({ input }) => {
            return prisma.pmIssue.updateMany({
                where: { id: { in: input.issueIds } },
                data: { sprintId: input.sprintId }
            });
        }),

    recommendPlan: publicProcedure
        .input(z.object({
            projectId: z.string(),
            targetVelocity: z.number().default(30)
        }))
        .mutation(async ({ input }) => {
            const startTime = Date.now();
            let success = false;
            try {
                // Fetch backlog / unassigned issues
                const backlogIssues = await prisma.pmIssue.findMany({
                    where: {
                        projectId: input.projectId,
                        status: { in: ["BACKLOG", "TODO"] },
                        sprintId: null
                    }
                });

                if (backlogIssues.length === 0) {
                    throw new Error("No available backlog issues found for planning.");
                }

                // Map format for LLM prompt
                const mappedBacklog = backlogIssues.map((i: PmIssue) => ({
                    id: i.id,
                    title: i.title,
                    complexityScore: (i as any).complexityScore || null,
                    priority: i.priority
                }));

                const plan = await generateSprintPlan(mappedBacklog, input.targetVelocity);
                success = true;

                // Return the populated issues along with reasoning
                const recommendedIssues = await prisma.pmIssue.findMany({
                    where: { id: { in: plan.recommendedIssueIds } },
                    include: {
                        assignee: { select: { id: true, name: true, image: true } }
                    }
                });

                return {
                    issues: recommendedIssues.map((issue: PmIssue & { assignee?: unknown }) => ({
                        ...issue,
                        complexityScore: (issue as any).complexityScore,
                        predictedTime: (issue as any).predictedTime,
                    })),
                    reasoning: plan.reasoning,
                    estimatedVelocity: plan.estimatedVelocity
                };

            } finally {
                langfuse.trace({
                    name: "pm.ai.sprint.recommend",
                    metadata: {
                        projectId: input.projectId,
                        targetVelocity: input.targetVelocity,
                        latencyMs: Date.now() - startTime,
                        success
                    }
                });
            }
        })
});

import { z } from "zod";
import { router, publicProcedure } from "../init";
import { PmIssueStatus, PmIssue } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { langfuse } from "@/lib/langfuse";
import { generateSprintPlan } from "@/lib/ai/pm-sprint-planning";


export const pmSprintsRouter = router({
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
                        status: { in: [PmIssueStatus.BACKLOG, PmIssueStatus.TODO] },
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

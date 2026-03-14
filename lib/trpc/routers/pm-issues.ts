import { z } from "zod";
import { router, publicProcedure } from "../init";
import { PmIssueStatus, PmIssuePriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { langfuse } from "@/lib/langfuse";
import { generateIssueFromPrompt } from "@/lib/ai/pm-issue-generation";
import { generateIssueInsights } from "@/lib/ai/pm-issue-insights";


export const pmIssuesRouter = router({
    listByProject: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmIssue.findMany({
                where: { projectId: input.projectId },
                include: {
                    assignee: { select: { id: true, name: true, image: true } },
                    labels: true,
                    sprint: { select: { id: true, name: true } }
                },
                orderBy: { updatedAt: 'desc' }
            });
        }),

    create: publicProcedure
        .input(z.object({
            projectId: z.string(),
            title: z.string().min(1),
            description: z.string().optional(),
            status: z.nativeEnum(PmIssueStatus).default(PmIssueStatus.TODO),
            priority: z.nativeEnum(PmIssuePriority).default(PmIssuePriority.NONE),
            assigneeId: z.string().optional().nullable(),
            storyPoints: z.number().optional().nullable(),
            complexityScore: z.number().optional().nullable(),
            creatorId: z.string(), // Extracted from session in production
        }))
        .mutation(async ({ input }) => {
            const startTime = Date.now();
            let success = false;

            try {
                const project = await prisma.pmProject.findUnique({ where: { id: input.projectId } });
                if (!project) throw new Error("Project not found");

                // Auto generate key (e.g. FPM-123) based on count
                const count = await prisma.pmIssue.count({ where: { projectId: input.projectId } });
                const nextKey = `${project.key}-${count + 1}`;

                const newIssue = await prisma.pmIssue.create({
                    data: {
                        ...input,
                        key: nextKey
                    }
                });

                success = true;
                return newIssue;
            } finally {
                const latency = Date.now() - startTime;

                // Fire and forget trace
                langfuse.trace({
                    name: "pm.issue.create",
                    userId: input.creatorId,
                    metadata: {
                        projectId: input.projectId,
                        latencyMs: latency,
                        success,
                    }
                });
            }
        }),

    generate: publicProcedure
        .input(z.object({
            prompt: z.string().min(5)
        }))
        .mutation(async ({ input }) => {
            const startTime = Date.now();
            let success = false;
            try {
                const generated = await generateIssueFromPrompt(input.prompt);
                success = true;
                return generated;
            } finally {
                langfuse.trace({
                    name: "pm.ai.issue.generate",
                    metadata: {
                        latencyMs: Date.now() - startTime,
                        success,
                        promptLength: input.prompt.length
                    }
                });
            }
        }),

    generateInsights: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            const startTime = Date.now();
            let success = false;
            try {
                const issue = await prisma.pmIssue.findUnique({ where: { id: input.id } });
                if (!issue) throw new Error("Issue not found");

                const insights = await generateIssueInsights(issue.title, issue.description);

                await prisma.pmIssue.update({
                    where: { id: input.id },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data: {
                        complexityScore: insights.complexityScore,
                        predictedTime: insights.predictedTime
                    } as any
                });

                success = true;
                return insights;
            } finally {
                langfuse.trace({
                    name: "pm.ai.issue.insights",
                    metadata: {
                        issueId: input.id,
                        latencyMs: Date.now() - startTime,
                        success
                    }
                });
            }
        }),

    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmIssue.findUnique({
                where: { id: input.id },
                include: {
                    assignee: { select: { id: true, name: true, image: true, email: true } },
                    creator: { select: { id: true, name: true, image: true } },
                    labels: true,
                    sprint: true,
                    comments: {
                        include: { author: { select: { id: true, name: true, image: true } } },
                        orderBy: { createdAt: 'asc' }
                    }
                }
            });
        })
});

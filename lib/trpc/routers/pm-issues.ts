import { z } from "zod";
import { router, publicProcedure } from "../init";
import { PrismaClient, PmIssueStatus, PmIssuePriority } from "@prisma/client";

const prisma = new PrismaClient();

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
            assigneeId: z.string().optional(),
            creatorId: z.string(), // Extracted from session in production
        }))
        .mutation(async ({ input }) => {
            const project = await prisma.pmProject.findUnique({ where: { id: input.projectId } });
            if (!project) throw new Error("Project not found");

            // Auto generate key (e.g. FPM-123) based on count
            const count = await prisma.pmIssue.count({ where: { projectId: input.projectId } });
            const nextKey = `${project.key}-${count + 1}`;

            return prisma.pmIssue.create({
                data: {
                    ...input,
                    key: nextKey
                }
            });
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

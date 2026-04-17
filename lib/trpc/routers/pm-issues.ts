import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../init";
import { PmIssueStatus, PmIssuePriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "../../analytics";
import { auditLog } from "@/lib/audit";

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

    create: protectedProcedure
        .input(z.object({
            projectId: z.string(),
            title: z.string().min(1),
            description: z.string().optional(),
            status: z.nativeEnum(PmIssueStatus).default(PmIssueStatus.TODO),
            priority: z.nativeEnum(PmIssuePriority).default(PmIssuePriority.NONE),
            assigneeId: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const creatorId = ctx.session.user.id;
            const project = await prisma.pmProject.findUnique({ where: { id: input.projectId } });
            if (!project) throw new Error("Project not found");

            // Auto generate key (e.g. FPM-123) based on count
            const count = await prisma.pmIssue.count({ where: { projectId: input.projectId } });
            const nextKey = `${project.key}-${count + 1}`;

            const issue = await prisma.pmIssue.create({
                data: {
                    ...input,
                    key: nextKey,
                    creatorId,
                }
            });
            
            await auditLog({
                workspaceId: project.workspaceId,
                userId: creatorId,
                action: "pm_issue.created",
                entityType: "PmIssue",
                entityId: issue.id,
                details: { key: issue.key, title: issue.title, projectId: issue.projectId }
            });

            await trackEvent("pm.issue.create", { userId: creatorId, projectId: input.projectId, issueId: issue.id });
            return issue;
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
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().optional(),
            description: z.string().optional(),
            status: z.nativeEnum(PmIssueStatus).optional(),
            priority: z.nativeEnum(PmIssuePriority).optional(),
            assigneeId: z.string().optional().nullable(),
            startDate: z.string().datetime().optional().nullable(),
            dueDate: z.string().datetime().optional().nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            const issue = await prisma.pmIssue.update({
                where: { id },
                data,
                include: { project: true }
            });
            
            await auditLog({
                workspaceId: issue.project.workspaceId,
                userId: ctx.session.user.id,
                action: "pm_issue.updated",
                entityType: "PmIssue",
                entityId: issue.id,
                details: { updatedFields: Object.keys(data) }
            });
            
            await trackEvent("pm.issue.edit", { userId: ctx.session.user.id, issueId: id });
            return issue;
        }),

    updateStatus: protectedProcedure
        .input(z.object({
            id: z.string(),
            status: z.nativeEnum(PmIssueStatus)
        }))
        .mutation(async ({ ctx, input }) => {
            const issue = await prisma.pmIssue.update({
                where: { id: input.id },
                data: { 
                    status: input.status,
                    statusHistory: {
                        create: {
                            status: input.status,
                            userId: ctx.session.user.id
                        }
                    }
                },
                include: { project: true }
            });
            
            await auditLog({
                workspaceId: issue.project.workspaceId,
                userId: ctx.session.user.id,
                action: "pm_issue.status_changed",
                entityType: "PmIssue",
                entityId: issue.id,
                details: { status: input.status }
            });

            await trackEvent("pm.board.move", { userId: ctx.session.user.id, issueId: input.id, to: input.status });
            return issue;
        }),

    listForCalendar: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmIssue.findMany({
                where: { projectId: input.projectId, dueDate: { not: null } },
                select: { id: true, title: true, dueDate: true, assignee: { select: { name: true, image: true } }, labels: true }
            });
        }),

    listForGantt: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmIssue.findMany({
                where: { projectId: input.projectId },
                select: { id: true, title: true, startDate: true, dueDate: true, status: true, assignee: { select: { id: true, name: true, image: true } } }
            });
        })
});

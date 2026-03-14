import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { PmIssuePriority, PmIssueType } from "@prisma/client";
import { langfuse } from "@/lib/langfuse";
import { generateIssueFromPrompt } from "@/lib/ai/pm-issue-generation";
import { generateIssueInsights } from "@/lib/ai/pm-issue-insights";
import { notify } from "@/lib/pm/notification-service";
import { dispatchWebhook } from "./pm-webhooks";

// ─────────────────────────────────────────────────────────────────────────────
// Shared filter schema – reusable for listByProject and saved views
// ─────────────────────────────────────────────────────────────────────────────
export const issueFilterSchema = z.object({
    projectId: z.string(),
    assigneeId: z.string().optional(),
    statusIn: z.array(z.string()).optional(),
    labelIds: z.array(z.string()).optional(),
    priority: z.nativeEnum(PmIssuePriority).optional(),
    sprintId: z.string().optional().nullable(),
    type: z.nativeEnum(PmIssueType).optional(),
    versionId: z.string().optional().nullable(),
    parentId: z.string().optional().nullable(),
    search: z.string().optional(),
    orderBy: z.enum(["updatedAt", "createdAt", "priority"]).default("updatedAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
    skip: z.number().int().min(0).default(0),
    take: z.number().int().min(1).max(200).default(100),
});

export const pmIssuesRouter = router({
    /**
     * List issues with powerful filtering and pagination.
     */
    listByProject: publicProcedure
        .input(issueFilterSchema)
        .query(async ({ input }) => {
            const {
                projectId, assigneeId, statusIn, labelIds, priority, sprintId,
                type, versionId, parentId, search, orderBy, order, skip, take
            } = input;

            const where: any = { projectId };

            if (assigneeId) where.assigneeId = assigneeId;
            if (statusIn?.length) where.status = { in: statusIn };
            if (priority) where.priority = priority;
            if (sprintId !== undefined) where.sprintId = sprintId;
            if (type) where.type = type;
            if (versionId !== undefined) where.versionId = versionId;
            if (parentId !== undefined) where.parentId = parentId;
            if (labelIds?.length) where.labels = { some: { id: { in: labelIds } } };
            if (search?.trim()) {
                where.OR = [
                    { title: { contains: search, mode: "insensitive" } },
                    { key: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                ];
            }

            return prisma.pmIssue.findMany({
                where,
                include: {
                    assignee: { select: { id: true, name: true, image: true } },
                    labels: true,
                    sprint: { select: { id: true, name: true } },
                    parent: { select: { id: true, key: true, title: true } },
                    version: { select: { id: true, name: true } },
                    _count: { select: { comments: true, attachments: true, children: true } }
                },
                orderBy: { [orderBy]: order },
                skip,
                take,
            });
        }),

    /**
     * Create a new issue.
     */
    create: publicProcedure
        .input(z.object({
            projectId: z.string(),
            title: z.string().min(1),
            description: z.string().optional(),
            status: z.string().default("TODO"),
            priority: z.nativeEnum(PmIssuePriority).default(PmIssuePriority.NONE),
            type: z.nativeEnum(PmIssueType).default(PmIssueType.TASK),
            assigneeId: z.string().optional().nullable(),
            storyPoints: z.number().optional().nullable(),
            complexityScore: z.number().optional().nullable(),
            originalEstimate: z.number().optional().nullable(),
            parentId: z.string().optional().nullable(),
            sprintId: z.string().optional().nullable(),
            versionId: z.string().optional().nullable(),
            labelIds: z.array(z.string()).optional(),
            creatorId: z.string(),
        }))
        .mutation(async ({ input }) => {
            const startTime = Date.now();
            let success = false;
            const { labelIds, ...issueData } = input;

            try {
                const project = await prisma.pmProject.findUnique({ where: { id: input.projectId } });
                if (!project) throw new Error("Project not found");

                const count = await prisma.pmIssue.count({ where: { projectId: input.projectId } });
                const nextKey = `${project.key}-${count + 1}`;

                const newIssue = await prisma.pmIssue.create({
                    data: {
                        ...issueData,
                        key: nextKey,
                        ...(labelIds?.length ? { labels: { connect: labelIds.map(id => ({ id })) } } : {})
                    }
                });

                // Notify assignee
                if (input.assigneeId && input.assigneeId !== input.creatorId) {
                    await notify(input.assigneeId, "issue_assigned", `You were assigned to ${nextKey}: ${input.title}`, {
                        issueId: newIssue.id,
                        issueKey: nextKey,
                        issueTitle: input.title,
                        projectId: input.projectId,
                    });
                }

                // Dispatch Webhook
                await dispatchWebhook(input.projectId, "issue.created", {
                    issueId: newIssue.id,
                    issueKey: nextKey,
                    issueTitle: input.title,
                    status: newIssue.status,
                    actorId: input.creatorId
                });

                success = true;
                return newIssue;
            } finally {
                langfuse.trace({
                    name: "pm.issue.create",
                    userId: input.creatorId,
                    metadata: { projectId: input.projectId, latencyMs: Date.now() - startTime, success }
                });
            }
        }),

    /**
     * Update an issue with activity logging.
     */
    update: publicProcedure
        .input(z.object({
            id: z.string(),
            title: z.string().min(1).optional(),
            description: z.string().optional().nullable(),
            status: z.string().optional(),
            priority: z.nativeEnum(PmIssuePriority).optional(),
            type: z.nativeEnum(PmIssueType).optional(),
            assigneeId: z.string().optional().nullable(),
            sprintId: z.string().optional().nullable(),
            versionId: z.string().optional().nullable(),
            storyPoints: z.number().optional().nullable(),
            complexityScore: z.number().optional().nullable(),
            originalEstimate: z.number().optional().nullable(),
            timeSpent: z.number().optional().nullable(),
            remainingTime: z.number().optional().nullable(),
            predictedTime: z.string().optional().nullable(),
            customFields: z.record(z.string(), z.unknown()).optional().nullable(),
            parentId: z.string().optional().nullable(),
            labelIds: z.array(z.string()).optional(),
            actorId: z.string(),
        }))
        .mutation(async ({ input }) => {
            const { id, actorId, labelIds, ...data } = input;

            return prisma.$transaction(async (tx: any) => {
                const oldIssue = await tx.pmIssue.findUnique({ where: { id } });
                if (!oldIssue) throw new Error("Issue not found");

                const updateData: any = Object.fromEntries(
                    Object.entries(data).filter(([_, v]) => v !== undefined)
                );

                if (labelIds !== undefined) {
                    updateData.labels = { set: labelIds.map(lid => ({ id: lid })) };
                }

                const updatedIssue = await tx.pmIssue.update({ where: { id }, data: updateData });

                // Log activity for each changed field
                const activities = [];
                for (const key of Object.keys(data)) {
                    const oldVal = oldIssue[key as keyof typeof oldIssue];
                    const newVal = updatedIssue[key as keyof typeof updatedIssue];
                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                        activities.push({
                            issueId: id, actorId, field: key,
                            oldValue: typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal ?? ""),
                            newValue: typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal ?? ""),
                        });
                    }
                }

                if (activities.length > 0) {
                    await tx.pmIssueActivity.createMany({ data: activities });
                }

                // Notify if assignee changed
                if (data.assigneeId && data.assigneeId !== oldIssue.assigneeId && data.assigneeId !== actorId) {
                    await notify(data.assigneeId, "issue_assigned",
                        `You were assigned to ${oldIssue.key}: ${oldIssue.title}`, {
                            issueId: id, issueKey: oldIssue.key, issueTitle: oldIssue.title, projectId: oldIssue.projectId
                        }
                    );
                }

                // Dispatch Webhook
                await dispatchWebhook(oldIssue.projectId, "issue.updated", {
                    issueId: id,
                    issueKey: oldIssue.key,
                    changes: activities.map(a => ({ field: a.field, old: a.oldValue, new: a.newValue })),
                    actorId
                });

                langfuse.trace({ name: "pm.issue.update", userId: actorId, metadata: { issueId: id, fields: Object.keys(data) } });

                return updatedIssue;
            });
        }),

    /**
     * Bulk update multiple issues at once.
     */
    bulkUpdate: publicProcedure
        .input(z.object({
            ids: z.array(z.string()).min(1).max(100),
            patch: z.object({
                status: z.string().optional(),
                priority: z.nativeEnum(PmIssuePriority).optional(),
                assigneeId: z.string().optional().nullable(),
                sprintId: z.string().optional().nullable(),
                labelIds: z.array(z.string()).optional(),
            }),
            actorId: z.string(),
        }))
        .mutation(async ({ input }) => {
            const { ids, patch, actorId } = input;
            const { labelIds, ...scalarPatch } = patch;

            // Build update data
            const updateData: any = Object.fromEntries(
                Object.entries(scalarPatch).filter(([_, v]) => v !== undefined)
            );
            if (labelIds !== undefined) {
                updateData.labels = { set: labelIds.map(id => ({ id })) };
            }

            // Update each issue
            const results = await Promise.all(
                ids.map(id => prisma.pmIssue.update({ where: { id }, data: updateData }))
            );

            langfuse.trace({ name: "pm.issue.bulkUpdate", userId: actorId, metadata: { count: ids.length } });

            return { updated: results.length };
        }),

    /**
     * Delete an issue.
     */
    delete: publicProcedure
        .input(z.object({ id: z.string(), actorId: z.string() }))
        .mutation(async ({ input }) => {
            await prisma.pmIssue.delete({ where: { id: input.id } });
            langfuse.trace({ name: "pm.issue.delete", userId: input.actorId, metadata: { issueId: input.id } });
            return { success: true };
        }),

    /**
     * Get full issue details with all relations.
     */
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
                    version: { select: { id: true, name: true } },
                    comments: {
                        where: { parentId: null },
                        include: {
                            author: { select: { id: true, name: true, image: true } },
                            replies: { include: { author: { select: { id: true, name: true, image: true } } }, orderBy: { createdAt: "asc" } }
                        },
                        orderBy: { createdAt: "asc" }
                    },
                    attachments: {
                        include: { uploader: { select: { id: true, name: true } } },
                        orderBy: { createdAt: "desc" }
                    },
                    parent: { select: { id: true, key: true, title: true } },
                    children: {
                        select: { id: true, key: true, title: true, status: true, type: true, assigneeId: true },
                        orderBy: { createdAt: "asc" }
                    },
                    activities: {
                        include: { actor: { select: { id: true, name: true, image: true } } },
                        orderBy: { createdAt: "desc" }
                    },
                    gitlabLinks: true,
                }
            });
        }),

    generate: publicProcedure
        .input(z.object({ prompt: z.string().min(5) }))
        .mutation(async ({ input }) => {
            const startTime = Date.now();
            let success = false;
            try {
                const generated = await generateIssueFromPrompt(input.prompt);
                success = true;
                return generated;
            } finally {
                langfuse.trace({ name: "pm.ai.issue.generate", metadata: { latencyMs: Date.now() - startTime, success } });
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
                    data: { complexityScore: insights.complexityScore, predictedTime: insights.predictedTime } as any
                });

                success = true;
                return insights;
            } finally {
                langfuse.trace({ name: "pm.ai.issue.insights", metadata: { issueId: input.id, latencyMs: Date.now() - startTime, success } });
            }
        }),
});

import { z } from "zod";
import { router, publicProcedure } from "../init";
import { ViewFilterSchema } from "@/types/gantt";
import type { GanttItem } from "@/types/gantt";
import { prisma } from "@/lib/prisma";

export const pmTimelineRouter = router({
    getUnifiedTimeline: publicProcedure
        .input(ViewFilterSchema)
        .query(async ({ input }): Promise<GanttItem[]> => {
            const { projectIds, assigneeIds, statuses, dateRange } = input;

            const where: Record<string, unknown> = {
                deletedAt: null,
            };

            if (projectIds && projectIds.length > 0) {
                where.projectId = { in: projectIds };
            }
            if (assigneeIds && assigneeIds.length > 0) {
                where.assigneeId = { in: assigneeIds };
            }
            if (statuses && statuses.length > 0) {
                where.status = { in: statuses };
            }
            if (dateRange) {
                where.OR = [
                    { dueDate: { gte: dateRange.from, lte: dateRange.to } },
                    { startDate: { gte: dateRange.from, lte: dateRange.to } },
                    {
                        AND: [
                            { startDate: { lte: dateRange.from } },
                            { dueDate: { gte: dateRange.to } },
                        ],
                    },
                ];
            }

            const issues = await prisma.pmIssue.findMany({
                where,
                include: {
                    project: { select: { id: true, name: true } },
                    assignee: { select: { id: true, name: true, email: true } },
                    sourceLinks: {
                        where: { type: "BLOCKS" },
                        select: { targetIssueId: true },
                    },
                },
                orderBy: { startDate: "asc" },
            });

            return issues.map((issue) => ({
                id: issue.id,
                title: issue.title,
                startDate: issue.startDate ?? null,
                dueDate: issue.dueDate ?? null,
                status: issue.status,
                assigneeId: issue.assigneeId ?? null,
                assigneeName: issue.assignee?.name ?? issue.assignee?.email ?? null,
                projectId: issue.projectId,
                projectName: issue.project.name,
                dependencies: issue.sourceLinks.map((l) => l.targetIssueId),
            }));
        }),

    updateDates: publicProcedure
        .input(
            z.object({
                id: z.string(),
                startDate: z.coerce.date().nullable(),
                dueDate: z.coerce.date().nullable(),
                actorId: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            return prisma.pmIssue.update({
                where: { id: input.id },
                data: {
                    startDate: input.startDate,
                    dueDate: input.dueDate,
                    activities: {
                        create: {
                            field: "dates",
                            oldValue: "unknown",
                            newValue: `start=${input.startDate?.toISOString() ?? "null"} due=${input.dueDate?.toISOString() ?? "null"}`,
                            actorId: input.actorId,
                        },
                    },
                },
            });
        }),
});

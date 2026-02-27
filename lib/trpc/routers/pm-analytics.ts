import { z } from "zod";
import { router, publicProcedure } from "../init";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const pmAnalyticsRouter = router({
    /**
     * Burndown data: completed story points per day in a sprint
     */
    burndown: publicProcedure
        .input(z.object({ sprintId: z.string() }))
        .query(async ({ input }) => {
            const sprint = await prisma.pmSprint.findUnique({
                where: { id: input.sprintId },
                include: { issues: true },
            });
            if (!sprint || !sprint.startDate || !sprint.endDate) return [];

            const totalPoints = sprint.issues.reduce((sum: number, i: any) => sum + (i.storyPoints ?? 0), 0);
            const startDate = new Date(sprint.startDate);
            const endDate = new Date(sprint.endDate);
            const days: { date: string; remaining: number; ideal: number }[] = [];
            let remaining = totalPoints;

            const msPerDay = 86400000;
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);

            for (let d = 0; d <= totalDays; d++) {
                const date = new Date(startDate.getTime() + d * msPerDay);
                const dateStr = date.toISOString().split("T")[0];

                // Issues completed on this day
                const completedToday = sprint.issues.filter((i: any) => {
                    if (!i.updatedAt) return false;
                    const updated = new Date(i.updatedAt).toISOString().split("T")[0];
                    return updated === dateStr && i.status === "DONE";
                });
                remaining -= completedToday.reduce((sum: number, i: any) => sum + (i.storyPoints ?? 0), 0);

                days.push({
                    date: dateStr,
                    remaining,
                    ideal: totalPoints - (totalPoints / totalDays) * d,
                });
            }

            return days;
        }),

    /**
     * Velocity: story points completed per sprint
     */
    velocity: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            const sprints = await prisma.pmSprint.findMany({
                where: { projectId: input.projectId, status: "COMPLETED" },
                include: { issues: true },
                orderBy: { startDate: "asc" },
            });

            return sprints.map((s: any) => ({
                sprint: s.name,
                completed: s.issues
                    .filter((i: any) => i.status === "DONE")
                    .reduce((sum: number, i: any) => sum + (i.storyPoints ?? 0), 0),
                committed: s.issues.reduce((sum: number, i: any) => sum + (i.storyPoints ?? 0), 0),
            }));
        }),

    /**
     * Cumulative Flow Diagram: issue count per status per day
     */
    cumulativeFlow: publicProcedure
        .input(z.object({ projectId: z.string(), days: z.number().default(30) }))
        .query(async ({ input }) => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - input.days);

            const issues = await prisma.pmIssue.findMany({
                where: { projectId: input.projectId, createdAt: { gte: cutoff } },
                select: { status: true, createdAt: true, updatedAt: true },
            });

            const result: Record<string, Record<string, number>> = {};
            const statuses = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

            for (let d = input.days; d >= 0; d--) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                const key = date.toISOString().split("T")[0];
                result[key] = {};
                for (const s of statuses) {
                    result[key][s] = issues.filter((i: any) => {
                        const created = new Date(i.createdAt) <= date;
                        return created && i.status === s;
                    }).length;
                }
            }

            return Object.entries(result).map(([date, counts]) => ({ date, ...counts }));
        }),

    /**
     * Cycle time per issue: days from creation to DONE
     */
    cycleTime: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            const issues = await prisma.pmIssue.findMany({
                where: { projectId: input.projectId, status: "DONE" },
                select: { key: true, title: true, createdAt: true, updatedAt: true, priority: true },
                orderBy: { updatedAt: "desc" },
                take: 50,
            });

            return issues.map((i: any) => ({
                key: i.key,
                title: i.title,
                priority: i.priority,
                cycleTime: Math.round(
                    (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / 86400000
                ),
                completedAt: i.updatedAt.toISOString().split("T")[0],
            }));
        }),

    /**
     * Team workload: open issues per assignee
     */
    workload: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            const issues = await prisma.pmIssue.findMany({
                where: { projectId: input.projectId, status: { not: "DONE" } },
                include: { assignee: { select: { id: true, name: true, image: true } } },
            });

            const byAssignee: Record<string, { name: string; count: number; points: number }> = {};
            for (const issue of issues) {
                const key = issue.assigneeId ?? "__unassigned__";
                const name = issue.assignee?.name ?? "Unassigned";
                if (!byAssignee[key]) byAssignee[key] = { name, count: 0, points: 0 };
                byAssignee[key].count++;
                byAssignee[key].points += issue.storyPoints ?? 0;
            }

            return Object.values(byAssignee).sort((a, b) => b.points - a.points);
        }),
});

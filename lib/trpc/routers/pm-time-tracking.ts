import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { langfuse } from "@/lib/langfuse";
import { TRPCError } from "@trpc/server";

// ─── Time Tracking tRPC Router ─────────────────────────────────────────────
// Issues have originalEstimate (minutes) and timeSpent (aggregate) on the
// PmIssue model.  Detailed log entries live in PmTimeLog.

export const pmTimeTrackingRouter = router({
    /** Log time against an issue */
    log: publicProcedure
        .input(z.object({
            issueId: z.string(),
            userId: z.string(),
            minutes: z.number().int().positive().max(1440), // max 24h per entry
            note: z.string().max(500).optional(),
            loggedAt: z.coerce.date().optional(),
        }))
        .mutation(async ({ input }) => {
            const [log] = await prisma.$transaction([
                prisma.pmTimeLog.create({
                    data: {
                        issueId: input.issueId,
                        userId: input.userId,
                        minutes: input.minutes,
                        note: input.note,
                        loggedAt: input.loggedAt ?? new Date(),
                    }
                }),
                // Keep denormalized timeSpent in sync on the issue
                prisma.pmIssue.update({
                    where: { id: input.issueId },
                    data: { timeSpent: { increment: input.minutes } },
                }),
            ]);

            langfuse.trace({
                name: "pm.time.log",
                metadata: { issueId: input.issueId, minutes: input.minutes },
            });

            return log;
        }),

    /** List time logs for an issue (most recent first) */
    listByIssue: publicProcedure
        .input(z.object({ issueId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmTimeLog.findMany({
                where: { issueId: input.issueId },
                orderBy: { loggedAt: "desc" },
                include: {
                    user: { select: { id: true, name: true, image: true } }
                }
            });
        }),

    /** Aggregate time per issue in a sprint */
    aggregateBySprint: publicProcedure
        .input(z.object({ sprintId: z.string() }))
        .query(async ({ input }) => {
            const sprint = await prisma.pmSprint.findUnique({
                where: { id: input.sprintId },
                include: {
                    issues: {
                        select: {
                            id: true,
                            key: true,
                            title: true,
                            originalEstimate: true,
                            timeSpent: true,
                        }
                    }
                }
            });

            if (!sprint) throw new TRPCError({ code: "NOT_FOUND", message: "Sprint not found" });

            const totalEstimated = sprint.issues.reduce((s, i) => s + (i.originalEstimate ?? 0), 0);
            const totalSpent = sprint.issues.reduce((s, i) => s + (i.timeSpent ?? 0), 0);

            return {
                sprint,
                totalEstimated,
                totalSpent,
                remainingMinutes: Math.max(0, totalEstimated - totalSpent),
                utilizationPct: totalEstimated > 0
                    ? Math.round((totalSpent / totalEstimated) * 100)
                    : 0,
            };
        }),

    /** Export time logs for a project as CSV-friendly data */
    exportByProject: publicProcedure
        .input(z.object({
            projectId: z.string(),
            from: z.coerce.date().optional(),
            to: z.coerce.date().optional(),
        }))
        .query(async ({ input }) => {
            const logs = await prisma.pmTimeLog.findMany({
                where: {
                    issue: { projectId: input.projectId },
                    ...(input.from || input.to ? {
                        loggedAt: {
                            ...(input.from ? { gte: input.from } : {}),
                            ...(input.to ? { lte: input.to } : {}),
                        }
                    } : {})
                },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    issue: { select: { id: true, key: true, title: true } },
                },
                orderBy: { loggedAt: "asc" },
            });

            return logs;
        }),

    /** Delete a time log entry (only owner or admin) */
    delete: publicProcedure
        .input(z.object({ id: z.string(), requesterId: z.string() }))
        .mutation(async ({ input }) => {
            const log = await prisma.pmTimeLog.findUnique({ where: { id: input.id } });
            if (!log) throw new TRPCError({ code: "NOT_FOUND", message: "Time log not found" });
            if (log.userId !== input.requesterId) {
                throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own time logs" });
            }

            await prisma.$transaction([
                prisma.pmTimeLog.delete({ where: { id: input.id } }),
                prisma.pmIssue.update({
                    where: { id: log.issueId },
                    data: { timeSpent: { decrement: log.minutes } },
                }),
            ]);

            return { success: true };
        }),
});

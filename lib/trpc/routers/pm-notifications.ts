import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const pmNotificationsRouter = router({
    /**
     * List notifications for the current user, most recent first.
     */
    list: publicProcedure
        .input(z.object({
            userId: z.string(),
            unreadOnly: z.boolean().optional().default(false),
            limit: z.number().min(1).max(100).default(50),
        }))
        .query(async ({ input }) => {
            return prisma.pmNotification.findMany({
                where: {
                    userId: input.userId,
                    ...(input.unreadOnly ? { read: false } : {})
                },
                orderBy: { createdAt: "desc" },
                take: input.limit,
            });
        }),

    /**
     * Count unread notifications for a user.
     */
    unreadCount: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmNotification.count({
                where: { userId: input.userId, read: false }
            });
        }),

    /**
     * Mark a single notification as read.
     */
    markRead: publicProcedure
        .input(z.object({ id: z.string(), userId: z.string() }))
        .mutation(async ({ input }) => {
            return prisma.pmNotification.updateMany({
                where: { id: input.id, userId: input.userId },
                data: { read: true }
            });
        }),

    /**
     * Mark all notifications as read for a user.
     */
    markAllRead: publicProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ input }) => {
            return prisma.pmNotification.updateMany({
                where: { userId: input.userId, read: false },
                data: { read: true }
            });
        }),

    /**
     * Delete old read notifications (cleanup).
     */
    clearRead: publicProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ input }) => {
            return prisma.pmNotification.deleteMany({
                where: { userId: input.userId, read: true }
            });
        }),
});

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const pmNotificationsRouter = router({
    list: protectedProcedure
        .input(z.object({
            unreadOnly: z.boolean().optional().default(false),
            limit: z.number().min(1).max(100).default(50),
        }))
        .query(async ({ ctx, input }) => {
            return prisma.pmNotification.findMany({
                where: {
                    userId: ctx.session.user.id,
                    ...(input.unreadOnly ? { read: false } : {})
                },
                orderBy: { createdAt: "desc" },
                take: input.limit,
            });
        }),

    unreadCount: protectedProcedure
        .query(async ({ ctx }) => {
            return prisma.pmNotification.count({
                where: { userId: ctx.session.user.id, read: false }
            });
        }),

    markRead: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return prisma.pmNotification.updateMany({
                where: { id: input.id, userId: ctx.session.user.id },
                data: { read: true }
            });
        }),

    markAllRead: protectedProcedure
        .mutation(async ({ ctx }) => {
            return prisma.pmNotification.updateMany({
                where: { userId: ctx.session.user.id, read: false },
                data: { read: true }
            });
        }),

    clearRead: protectedProcedure
        .mutation(async ({ ctx }) => {
            return prisma.pmNotification.deleteMany({
                where: { userId: ctx.session.user.id, read: true }
            });
        }),
});

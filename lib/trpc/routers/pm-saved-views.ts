import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

export const pmSavedViewsRouter = router({
    list: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input, ctx }) => {
            return prisma.pmSavedView.findMany({
                where: {
                    projectId: input.projectId,
                    userId: ctx.session.user.id,
                },
                orderBy: { updatedAt: "desc" },
            });
        }),

    create: protectedProcedure
        .input(z.object({
            projectId: z.string(),
            name: z.string().min(1).max(80),
            filters: z.record(z.string(), z.any()).default({}),
            columns: z.array(z.string()).default([]),
            groupBy: z.string().nullable().optional(),
            sortBy: z.string().nullable().optional(),
            sortDir: z.enum(["asc", "desc"]).nullable().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            return prisma.pmSavedView.create({
                data: { ...input, userId: ctx.session.user.id }
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).max(80).optional(),
            filters: z.record(z.string(), z.any()).optional(),
            columns: z.array(z.string()).optional(),
            groupBy: z.string().nullable().optional(),
            sortBy: z.string().nullable().optional(),
            sortDir: z.enum(["asc", "desc"]).nullable().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const view = await prisma.pmSavedView.findUnique({ where: { id: input.id } });
            if (!view || view.userId !== ctx.session.user.id) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }
            const { id, ...data } = input;
            return prisma.pmSavedView.update({ where: { id }, data });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const view = await prisma.pmSavedView.findUnique({ where: { id: input.id } });
            if (!view || view.userId !== ctx.session.user.id) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }
            await prisma.pmSavedView.delete({ where: { id: input.id } });
            return { success: true };
        }),
});

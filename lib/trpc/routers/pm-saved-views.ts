import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const pmSavedViewsRouter = router({
    list: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmSavedView.findMany({
                where: { projectId: input.projectId },
                orderBy: { createdAt: "desc" }
            });
        }),

    create: publicProcedure
        .input(z.object({
            projectId: z.string(),
            userId: z.string(),
            name: z.string().min(1),
            filters: z.record(z.string(), z.any()),
        }))
        .mutation(async ({ input }) => {
            return prisma.pmSavedView.create({
                data: input
            });
        }),

    update: publicProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            filters: z.record(z.string(), z.any()).optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            return prisma.pmSavedView.update({
                where: { id },
                data
            });
        }),

    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            await prisma.pmSavedView.delete({ where: { id: input.id } });
            return { success: true };
        }),
});

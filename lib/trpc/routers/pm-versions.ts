import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const pmVersionsRouter = router({
    list: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmVersion.findMany({
                where: { projectId: input.projectId, deletedAt: null } as any,
                orderBy: { releaseDate: "asc" }
            });
        }),

    create: publicProcedure
        .input(z.object({
            projectId: z.string(),
            name: z.string().min(1),
            description: z.string().optional(),
            releaseDate: z.date().optional(),
            released: z.boolean().default(false),
        }))
        .mutation(async ({ input }) => {
            return prisma.pmVersion.create({
                data: input
            });
        }),

    update: publicProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            description: z.string().optional(),
            releaseDate: z.date().optional(),
            released: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            return prisma.pmVersion.update({
                where: { id },
                data
            });
        }),

    delete: publicProcedure
        .input(z.object({ id: z.string(), actorId: z.string().optional() }))
        .mutation(async ({ input }) => {
            await prisma.pmVersion.update({ 
                where: { id: input.id },
                data: { deletedAt: new Date(), deletedById: input.actorId } as any
            });
            return { success: true };
        }),
});

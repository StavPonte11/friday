import { z } from "zod";
import { router, publicProcedure } from "../server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Simplified public procedures for foundational phase.
// In actual production, use privateProcedure with protected session/workspace context.
export const pmProjectsRouter = router({
    list: publicProcedure
        .input(z.object({ workspaceId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmProject.findMany({
                where: { workspaceId: input.workspaceId },
                include: {
                    _count: {
                        select: { issues: true, sprints: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });
        }),

    create: publicProcedure
        .input(z.object({
            workspaceId: z.string(),
            name: z.string().min(1),
            key: z.string().min(2).max(10).toUpperCase(),
            description: z.string().optional()
        }))
        .mutation(async ({ input }) => {
            // Validate unique key
            const existing = await prisma.pmProject.findUnique({ where: { key: input.key } });
            if (existing) throw new Error(`Project key ${input.key} already exists`);

            return prisma.pmProject.create({
                data: input
            });
        }),

    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmProject.findUnique({
                where: { id: input.id },
                include: {
                    sprints: true
                }
            });
        })
});

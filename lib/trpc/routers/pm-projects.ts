import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";


// Simplified public procedures for foundational phase.
// In actual production, use privateProcedure with protected session/workspace context.
export const pmProjectsRouter = router({
    list: publicProcedure
        .input(z.object({ workspaceId: z.string().optional() }).optional())
        .query(async ({ input }) => {
            const whereClause = input?.workspaceId ? { workspaceId: input.workspaceId } : undefined;
            return prisma.pmProject.findMany({
                where: whereClause,
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

    get: publicProcedure
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

import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const pmSearchRouter = router({
    global: publicProcedure
        .input(z.object({ 
            query: z.string().min(2), 
            limit: z.number().int().min(1).default(5),
            userId: z.string().optional()
        }))
        .query(async ({ input }) => {
            const [issues, projects] = await Promise.all([
                prisma.pmIssue.findMany({
                    where: {
                        deletedAt: null,
                        OR: [
                            { title: { contains: input.query, mode: "insensitive" } },
                            { key: { contains: input.query, mode: "insensitive" } },
                            { description: { contains: input.query, mode: "insensitive" } }
                        ]
                    },
                    take: input.limit,
                    select: { id: true, key: true, title: true, status: true, projectId: true }
                }),
                prisma.pmProject.findMany({
                    where: {
                        OR: [
                            { name: { contains: input.query, mode: "insensitive" } },
                            { key: { contains: input.query, mode: "insensitive" } },
                        ]
                    },
                    take: input.limit,
                    select: { id: true, key: true, name: true }
                })
            ]);
            
            return { issues, projects };
        }),
        
    recent: publicProcedure
        .input(z.object({ userId: z.string(), limit: z.number().int().default(5) }))
        .query(async ({ input }) => {
            const recentViews = await prisma.pmRecentView.findMany({
                where: { userId: input.userId },
                orderBy: { viewedAt: 'desc' },
                take: input.limit
            });
            
            const issueIds = recentViews.filter(r => r.entityType === 'issue').map(r => r.entityId);
            const projectIds = recentViews.filter(r => r.entityType === 'project').map(r => r.entityId);
            
            const [issues, projects] = await Promise.all([
                issueIds.length > 0 ? prisma.pmIssue.findMany({
                    where: { id: { in: issueIds }, deletedAt: null },
                    select: { id: true, key: true, title: true, status: true }
                }) : [],
                projectIds.length > 0 ? prisma.pmProject.findMany({
                    where: { id: { in: projectIds } },
                    select: { id: true, key: true, name: true }
                }) : []
            ]);
            
            return { issues, projects, orderedRaw: recentViews };
        }),

    // Returns users matching a name/email prefix — used for @mention autocomplete
    mentionUsers: publicProcedure
        .input(z.object({ query: z.string(), limit: z.number().int().default(6) }))
        .query(async ({ input }) => {
            if (input.query.trim().length < 1) {
                return prisma.user.findMany({
                    take: input.limit,
                    select: { id: true, name: true, email: true, image: true }
                });
            }
            return prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: input.query, mode: "insensitive" } },
                        { email: { contains: input.query, mode: "insensitive" } },
                    ]
                },
                take: input.limit,
                select: { id: true, name: true, email: true, image: true }
            });
        }),
});

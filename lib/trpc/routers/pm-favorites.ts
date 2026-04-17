import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const pmFavoritesRouter = router({
    list: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            const favorites = await (prisma as any).pmFavorite.findMany({
                where: { userId: input.userId },
                orderBy: { createdAt: "desc" }
            });

            const issueIds = favorites.filter((f: any) => f.entityType === 'issue').map((f: any) => f.entityId);
            const projectIds = favorites.filter((f: any) => f.entityType === 'project').map((f: any) => f.entityId);

            const [issues, projects] = await Promise.all([
                issueIds.length ? prisma.pmIssue.findMany({ where: { id: { in: issueIds }, deletedAt: null } as any, select: { id: true, key: true, title: true, status: true } }) : [],
                projectIds.length ? prisma.pmProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, key: true, name: true } }) : []
            ]);

            return { issues, projects, orderedRaw: favorites };
        }),

    toggle: publicProcedure
        .input(z.object({ userId: z.string(), entityType: z.enum(["project", "issue", "view"]), entityId: z.string() }))
        .mutation(async ({ input }) => {
            const existing = await (prisma as any).pmFavorite.findUnique({
                where: { userId_entityType_entityId: input }
            });
            if (existing) {
                await (prisma as any).pmFavorite.delete({ where: { id: existing.id } });
                return { pinned: false };
            } else {
                await (prisma as any).pmFavorite.create({ data: input });
                return { pinned: true };
            }
        })
});

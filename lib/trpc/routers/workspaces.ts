import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const workspacesRouter = router({
    list: publicProcedure.query(async () => {
        return prisma.workspace.findMany({
            orderBy: { createdAt: "asc" },
        });
    }),
    
    members: publicProcedure
        .input(z.object({ workspaceId: z.string() }))
        .query(async ({ input }) => {
            return prisma.workspaceMember.findMany({
                where: { workspaceId: input.workspaceId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    }
                },
                orderBy: { createdAt: "asc" },
            });
        }),
});

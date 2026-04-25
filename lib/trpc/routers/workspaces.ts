import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const workspacesRouter = router({
    list: publicProcedure.query(async () => {
        return prisma.workspace.findMany({
            orderBy: { createdAt: "asc" },
        });
    }),

    create: publicProcedure
        .input(z.object({ name: z.string().min(3) }))
        .mutation(async ({ input, ctx }) => {
            // In a real app, we'd get the user from ctx.session.
            // For now, we'll try to get the current user if available, 
            // or fallback to the admin user for the wizard.
            const user = await prisma.user.findFirst(); 
            if (!user) throw new Error("No user found to assign as workspace owner");

            const workspace = await prisma.workspace.create({
                data: {
                    name: input.name,
                    slug: input.name.toLowerCase().replace(/\s+/g, '-'),
                    members: {
                        create: {
                            userId: user.id,
                            role: "OWNER"
                        }
                    }
                }
            });

            return workspace;
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

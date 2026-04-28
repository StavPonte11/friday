import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

export const workspacesRouter = router({
    /** Only returns workspaces the authenticated user belongs to */
    list: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId },
            include: { workspace: true },
            orderBy: { createdAt: "asc" },
        });
        return memberships.map((m) => m.workspace);
    }),

    create: protectedProcedure
        .input(z.object({ name: z.string().min(3) }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            
            // Generate a safe unique slug
            let baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            if (!baseSlug) baseSlug = 'workspace';
            const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

            const workspace = await prisma.workspace.create({
                data: {
                    name: input.name,
                    slug: uniqueSlug,
                    members: {
                        create: {
                            userId: userId,
                            role: "OWNER"
                        }
                    }
                }
            });

            return workspace;
        }),

    update: protectedProcedure
        .input(z.object({
            workspaceId: z.string(),
            name: z.string().min(3).optional(),
            logoUrl: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            // Only OWNER/ADMIN can update
            const member = await prisma.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId: input.workspaceId, userId } }
            });
            if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update workspace settings" });
            }
            const { workspaceId, ...data } = input;
            return prisma.workspace.update({ where: { id: workspaceId }, data });
        }),

    delete: protectedProcedure
        .input(z.object({ workspaceId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            const member = await prisma.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId: input.workspaceId, userId } }
            });
            if (!member || member.role !== "OWNER") {
                throw new TRPCError({ code: "FORBIDDEN", message: "Only the workspace owner can delete it" });
            }
            await prisma.workspace.delete({ where: { id: input.workspaceId } });
            return { success: true };
        }),

    members: protectedProcedure
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


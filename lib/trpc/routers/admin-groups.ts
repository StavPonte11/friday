import { z } from 'zod';
import { router, adminProcedure } from '../init';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { auditLog } from '@/lib/observability/logger';

export const adminGroupsRouter = router({
    list: adminProcedure
        .input(z.object({ workspaceId: z.string() }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.workspaceId !== input.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

            const groups = await prisma.workspaceGroup.findMany({
                where: { workspaceId: input.workspaceId },
                include: {
                    _count: { select: { members: true } }
                },
                orderBy: { name: 'asc' }
            });

            return groups;
        }),

    create: adminProcedure
        .input(z.object({
            workspaceId: z.string(),
            name: z.string().min(2),
            description: z.string().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.workspaceId !== input.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

            const group = await prisma.workspaceGroup.create({
                data: {
                    workspaceId: input.workspaceId,
                    name: input.name,
                    description: input.description
                }
            });

            await auditLog({ action: "GROUP_CREATED", actorId: ctx.session.user.id, workspaceId: input.workspaceId, metadata: { groupId: group.id } });
            return group;
        }),

    update: adminProcedure
        .input(z.object({
            workspaceId: z.string(),
            groupId: z.string(),
            name: z.string().min(2),
            description: z.string().nullable()
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.workspaceId !== input.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

            const group = await prisma.workspaceGroup.update({
                where: { id: input.groupId, workspaceId: input.workspaceId },
                data: { name: input.name, description: input.description }
            });

            return group;
        }),

    delete: adminProcedure
        .input(z.object({ workspaceId: z.string(), groupId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.workspaceId !== input.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

            await prisma.workspaceGroup.delete({
                where: { id: input.groupId, workspaceId: input.workspaceId }
            });

            await auditLog({ action: "GROUP_DELETED", actorId: ctx.session.user.id, workspaceId: input.workspaceId, metadata: { groupId: input.groupId } });
            return { success: true };
        }),

    getMembers: adminProcedure
        .input(z.object({ workspaceId: z.string(), groupId: z.string() }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.workspaceId !== input.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

            const members = await prisma.workspaceGroupMember.findMany({
                where: { groupId: input.groupId },
                include: { user: { select: { id: true, name: true, email: true, image: true } } }
            });

            return members;
        }),

    addMember: adminProcedure
        .input(z.object({ workspaceId: z.string(), groupId: z.string(), userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.workspaceId !== input.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

            // check group exists in workspace
            const group = await prisma.workspaceGroup.findUnique({ where: { id: input.groupId } });
            if (!group || group.workspaceId !== input.workspaceId) throw new TRPCError({ code: 'NOT_FOUND' });

            await prisma.workspaceGroupMember.create({
                data: { groupId: input.groupId, userId: input.userId }
            });

            return { success: true };
        }),

    removeMember: adminProcedure
        .input(z.object({ workspaceId: z.string(), groupId: z.string(), userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.workspaceId !== input.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

            await prisma.workspaceGroupMember.delete({
                where: { groupId_userId: { groupId: input.groupId, userId: input.userId } }
            });

            return { success: true };
        })
});

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../init';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { checkPermission } from '@/lib/auth/rbac';
import crypto from "crypto";

export const boardAccessRouter = router({
    getAccess: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input, ctx }) => {
            // First ensure they can even view it
            const canView = await checkPermission(ctx.session.user.id, "board:view", { projectId: input.projectId });
            if (!canView) throw new TRPCError({ code: 'FORBIDDEN', message: "No access to this board" });

            const [userAccess, groupAccess] = await Promise.all([
                prisma.pmBoardAccess.findMany({
                    where: { projectId: input.projectId, entityType: 'USER' },
                    include: {
                        // Prisma does not support polymorphic joins trivially, so we manual fetch
                        // Actually since entityId is polymorphic, we fetch the users manually for UI
                    }
                }),
                prisma.pmBoardAccess.findMany({
                    where: { projectId: input.projectId, entityType: 'GROUP' },
                    include: {
                        group: { select: { id: true, name: true } }
                    }
                })
            ]);

            // Hydrate user names
            const userIds = userAccess.map(a => a.entityId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, email: true, image: true }
            });

            const userMap = new Map(users.map(u => [u.id, u]));

            const hydratedUsers = userAccess.map(a => ({
                id: a.id,
                entityId: a.entityId,
                role: a.role,
                user: userMap.get(a.entityId)
            }));

            return {
                users: hydratedUsers,
                groups: groupAccess.map(a => ({
                    id: a.id,
                    entityId: a.entityId,
                    role: a.role,
                    group: a.group
                }))
            };
        }),

    grant: adminProcedure
        .input(z.object({
            projectId: z.string(),
            entityType: z.enum(['USER', 'GROUP']),
            entityId: z.string(),
            role: z.enum(['VIEWER', 'EDITOR'])
        }))
        .mutation(async ({ input, ctx }) => {
            const project = await prisma.pmProject.findUnique({ where: { id: input.projectId } });
            if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
            if (project.workspaceId !== ctx.session.user.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

            const grant = await prisma.pmBoardAccess.upsert({
                where: { projectId_entityType_entityId: { projectId: input.projectId, entityType: input.entityType, entityId: input.entityId } },
                update: { role: input.role },
                create: {
                    projectId: input.projectId,
                    entityType: input.entityType,
                    entityId: input.entityId,
                    role: input.role,
                    grantedById: ctx.session.user.id
                }
            });

            return grant;
        }),

    revoke: adminProcedure
        .input(z.object({ accessId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const access = await prisma.pmBoardAccess.findUnique({ where: { id: input.accessId }, include: { project: true } });
            if (!access) throw new TRPCError({ code: 'NOT_FOUND' });
            if (access.project.workspaceId !== ctx.session.user.workspaceId) throw new TRPCError({ code: 'FORBIDDEN' });

            await prisma.pmBoardAccess.delete({ where: { id: input.accessId } });
            return { success: true };
        }),

    canEdit: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input, ctx }) => {
            return checkPermission(ctx.session.user.id, "board:edit", { projectId: input.projectId });
        }),

    getLink: adminProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input, ctx }) => {
            return prisma.pmShareToken.findFirst({
                where: { projectId: input.projectId, workspaceId: ctx.session.user.workspaceId }
            });
        }),

    createLink: adminProcedure
        .input(z.object({ projectId: z.string(), isPublic: z.boolean().default(false), password: z.string().optional() }))
        .mutation(async ({ input, ctx }) => {
            // Remove old link
            await prisma.pmShareToken.deleteMany({
                where: { projectId: input.projectId, workspaceId: ctx.session.user.workspaceId }
            });

            const token = crypto.randomBytes(16).toString('hex');
            
            // In a real app we'd hash the password if provided. Mocking hash here since no bcrypt in this setup config easily.
            // Wait, we have bcrypt!
            let passwordHash = undefined;
            if (input.password) {
                const bcrypt = require("bcryptjs");
                passwordHash = await bcrypt.hash(input.password, 10);
            }

            return prisma.pmShareToken.create({
                data: {
                    token,
                    projectId: input.projectId,
                    workspaceId: ctx.session.user.workspaceId,
                    createdById: ctx.session.user.id,
                    isPublic: input.isPublic,
                    passwordHash
                }
            });
        }),

    revokeLink: adminProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            await prisma.pmShareToken.deleteMany({
                where: { projectId: input.projectId, workspaceId: ctx.session.user.workspaceId }
            });
            return { success: true };
        })
});

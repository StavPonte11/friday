import { z } from 'zod';
import { router, adminProcedure } from '../init';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { auditLog } from '@/lib/audit';

export const adminUsersRouter = router({
    list: adminProcedure
        .input(z.object({
            workspaceId: z.string(),
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(100).default(50),
            search: z.string().optional()
        }))
        .query(async ({ input, ctx }) => {
            const { workspaceId, page, limit, search } = input;
            
            // Org isolation happens implicitly because workspace members are scoped to workspaceId
            // but we must ensure the admin caller actually belongs to this workspace
            if (ctx.session.user.workspaceId !== workspaceId) {
                // If they are a global admin trying to view another workspace, that requires special handling
                // For now, strict isolation:
                throw new TRPCError({ code: "FORBIDDEN", message: "Workspace mismatch" });
            }

            const skip = (page - 1) * limit;

            const where = {
                workspaceId,
                user: search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                        { email: { contains: search, mode: 'insensitive' as const } }
                    ]
                } : undefined
            };

            const [members, total] = await Promise.all([
                prisma.workspaceMember.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        user: { select: { id: true, name: true, email: true, image: true, isActive: true } }
                    },
                    orderBy: {
                        user: { name: 'asc' }
                    }
                }),
                prisma.workspaceMember.count({ where })
            ]);

            return {
                users: members.map(m => ({
                    ...m.user,
                    role: m.role,
                    memberId: m.id
                })),
                total,
                basePages: Math.ceil(total / limit)
            };
        }),

    updateRole: adminProcedure
        .input(z.object({
            workspaceId: z.string(),
            userId: z.string(),
            newRole: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.workspaceId !== input.workspaceId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            // check if they are trying to demote the last owner
            if (input.newRole !== 'OWNER') {
                const currentMember = await prisma.workspaceMember.findUnique({
                    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } }
                });
                if (currentMember?.role === 'OWNER') {
                    const ownerCount = await prisma.workspaceMember.count({
                        where: { workspaceId: input.workspaceId, role: 'OWNER' }
                    });
                    if (ownerCount <= 1) {
                        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot demote the last owner." });
                    }
                }
            }

            const updated = await prisma.workspaceMember.update({
                where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
                data: { role: input.newRole }
            });

            await auditLog({
                action: "USER_ROLE_UPDATED",
                actorId: ctx.session.user.id,
                workspaceId: input.workspaceId,
                metadata: { targetUserId: input.userId, newRole: input.newRole }
            });

            return updated;
        }),

    deactivate: adminProcedure
        .input(z.object({
            workspaceId: z.string(),
            userId: z.string()
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.workspaceId !== input.workspaceId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            // We do a soft deactivate on User level. In a truly multi-tenant system where user spans orgs,
            // we'd remove them from workspace instead. For FRIDAY MVP, we'll mark isActive = false.
            await prisma.user.update({
                where: { id: input.userId },
                data: { isActive: false }
            });

            // revoke all sessions
            await prisma.session.deleteMany({
                where: { userId: input.userId }
            });

            await auditLog({
                action: "USER_DEACTIVATED",
                actorId: ctx.session.user.id,
                workspaceId: input.workspaceId,
                metadata: { targetUserId: input.userId }
            });

            return { success: true };
        })
});

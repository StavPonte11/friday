import { expect, test, describe, vi } from 'vitest';
import { appRouter } from '@/lib/trpc/server';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        workspaceMember: { 
            findMany: vi.fn(),
            count: vi.fn(),
            update: vi.fn(),
            findUnique: vi.fn()
        },
        user: { update: vi.fn() },
        session: { deleteMany: vi.fn() },
        auditLog: { create: vi.fn() }
    }
}));

vi.mock('@/lib/audit', () => ({
    auditLog: vi.fn()
}));

const mockCtx = (role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' = 'ADMIN', workspaceId = 'w1') => ({
    session: { user: { id: 'admin1', role, workspaceId, email: 'a@t.com', name: 'A' } }
});

describe('adminUsers Router', () => {
    test('list fails if ctx workspace mismatch', async () => {
        const caller = appRouter.createCaller(mockCtx('ADMIN', 'w2') as any);
        await expect(caller.adminUsers.list({ workspaceId: 'w1' })).rejects.toThrow('Workspace mismatch');
    });

    test('updateRole catches demoting last owner', async () => {
        const caller = appRouter.createCaller(mockCtx('OWNER', 'w1') as any);
        
        vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({ role: 'OWNER' } as any);
        vi.mocked(prisma.workspaceMember.count).mockResolvedValue(1);

        await expect(caller.adminUsers.updateRole({ workspaceId: 'w1', userId: 'u1', newRole: 'ADMIN' })).rejects.toThrow('Cannot demote the last owner');
    });

    test('deactivate cascades to session and user', async () => {
        const caller = appRouter.createCaller(mockCtx('ADMIN', 'w1') as any);
        
        await caller.adminUsers.deactivate({ workspaceId: 'w1', userId: 'u1' });

        expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { isActive: false }});
        expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' }});
    });
});

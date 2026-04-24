import { expect, test, describe, vi } from 'vitest';
import { appRouter } from '@/lib/trpc/server';
import { prisma } from '@/lib/prisma';
import * as rbac from '@/lib/auth/rbac';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        pmProject: { findUnique: vi.fn() },
        pmBoardAccess: { upsert: vi.fn(), delete: vi.fn(), findUnique: vi.fn() }
    }
}));

vi.mock('@/lib/auth/rbac', () => ({
    checkPermission: vi.fn()
}));

const mockCtx = (workspaceId = 'w1') => ({
    session: { user: { id: 'admin1', role: 'ADMIN', workspaceId, email: 'a@t.com', name: 'A' } }
});

describe('boardAccess Router', () => {
    test('grant requires project to be in same workspace', async () => {
        const caller = appRouter.createCaller(mockCtx('w1') as any);
        vi.mocked(prisma.pmProject.findUnique).mockResolvedValue({ workspaceId: 'w2' } as any);

        await expect(caller.boardAccess.grant({ projectId: 'p1', entityType: 'USER', entityId: 'u1', role: 'VIEWER' }))
            .rejects.toThrow('FORBIDDEN');
    });

    test('canEdit uses centralized checkPermission', async () => {
        const caller = appRouter.createCaller(mockCtx('w1') as any);
        vi.mocked(rbac.checkPermission).mockResolvedValue(true);

        const res = await caller.boardAccess.canEdit({ projectId: 'p1' });
        expect(rbac.checkPermission).toHaveBeenCalledWith('admin1', 'board:edit', { projectId: 'p1' });
        expect(res).toBe(true);
    });
});

import { expect, test, describe, vi, beforeEach } from 'vitest';
import { checkPermission, checkBoardAccess } from '@/lib/auth/rbac';
import { prisma } from '@/lib/prisma';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        workspaceMember: { findFirst: vi.fn() },
        pmBoardAccess: { findFirst: vi.fn() },
        workspaceGroupMember: { findMany: vi.fn() }
    }
}));

describe('RBAC checkPermission', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('OWNER inherently gets board:edit everywhere, bypasses board access check', async () => {
        vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ role: 'OWNER' } as any);
        
        const result = await checkPermission('u1', 'board:edit', { projectId: 'p1' });
        expect(result).toBe(true);
        expect(prisma.pmBoardAccess.findFirst).not.toHaveBeenCalled();
    });

    test('MEMBER requires direct/group access for board:edit', async () => {
        vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ role: 'MEMBER' } as any);
        // Direct access mock returns true
        vi.mocked(prisma.pmBoardAccess.findFirst).mockResolvedValue({ id: '1', role: 'EDITOR' } as any);
        
        const result = await checkPermission('u1', 'board:edit', { projectId: 'p1' });
        expect(result).toBe(true);
        expect(prisma.pmBoardAccess.findFirst).toHaveBeenCalled();
    });

    test('MEMBER gets rejected if no direct or group access for board:edit', async () => {
        vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ role: 'MEMBER' } as any);
        vi.mocked(prisma.pmBoardAccess.findFirst).mockResolvedValue(null);
        vi.mocked(prisma.workspaceGroupMember.findMany).mockResolvedValue([]);
        
        const result = await checkPermission('u1', 'board:edit', { projectId: 'p1' });
        expect(result).toBe(false);
    });

    test('Group access inherits correctly', async () => {
        vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({ role: 'MEMBER' } as any);
        
        // Emulate no direct grant, but has group grant
        vi.mocked(prisma.pmBoardAccess.findFirst)
            .mockResolvedValueOnce(null) // direct check
            .mockResolvedValueOnce({ id: '2', role: 'EDITOR' } as any); // group check
        
        vi.mocked(prisma.workspaceGroupMember.findMany).mockResolvedValue([{ groupId: 'g1' }] as any);

        const result = await checkBoardAccess('u1', 'p1', 'board:edit');
        expect(result).toBe(true);
    });
});

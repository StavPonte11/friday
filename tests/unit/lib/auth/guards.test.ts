import { expect, test, describe } from 'vitest';
import { requireAuth, requireRole, hasRole } from '@/lib/auth/guards';
import type { SessionUser } from '@/lib/auth/session';

describe('Auth Guards', () => {
    const adminUser: SessionUser = { id: '1', email: 'admin@t.com', name: null, image: null, role: 'ADMIN', workspaceId: 'w1' };
    const memberUser: SessionUser = { id: '2', email: 'm@t.com', name: null, image: null, role: 'MEMBER', workspaceId: 'w1' };
    const ownerUser: SessionUser = { id: '3', email: 'o@t.com', name: null, image: null, role: 'OWNER', workspaceId: 'w1' };

    test('requireAuth throws TRPCError UNAUTHORIZED on null/undefined', () => {
        expect(() => requireAuth(null)).toThrow('UNAUTHORIZED');
        expect(() => requireAuth(undefined)).toThrow('UNAUTHORIZED');
    });

    test('requireAuth passes on valid user', () => {
        expect(() => requireAuth(adminUser)).not.toThrow();
    });

    test('requireRole throws TRPCError FORBIDDEN on insufficient role', () => {
        expect(() => requireRole(memberUser, 'ADMIN')).toThrow('FORBIDDEN');
    });

    test('requireRole passes on exact and higher roles', () => {
        expect(() => requireRole(adminUser, 'ADMIN')).not.toThrow();
        expect(() => requireRole(ownerUser, 'ADMIN')).not.toThrow();
    });

    test('hasRole returns correct boolean', () => {
        expect(hasRole(memberUser, 'ADMIN')).toBe(false);
        expect(hasRole(adminUser, 'ADMIN')).toBe(true);
        expect(hasRole(ownerUser, 'MEMBER')).toBe(true);
    });
});

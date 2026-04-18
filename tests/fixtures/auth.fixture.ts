import { test as base, Page } from '@playwright/test';

type UserRole = 'Admin' | 'Manager' | 'Developer';

type AuthFixtures = {
    loginAs: (role: UserRole) => Promise<void>;
    userSession: Page;
};

export const test = base.extend<AuthFixtures>({
    loginAs: async ({ page }, use) => {
        const loginFn = async (role: UserRole) => {
            // Mock authentication or route through to local dev-tools
            await page.route('/api/auth/session', async (route) => {
                const json = {
                    user: { id: "test-user-id", name: `Test ${role}`, email: `test-${role.toLowerCase()}@friday.app`, role },
                    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
                };
                await route.fulfill({ json });
            });

            await page.goto('/en/docs/overview');
        };
        await use(loginFn);
    },
    
    userSession: async ({ page, loginAs }, use) => {
        // By default, a userSession uses 'Developer' role
        await loginAs('Developer');
        await use(page);
    }
});

export const expect = test.expect;

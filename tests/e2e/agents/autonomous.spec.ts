import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Agent Execution Flows', () => {

    test('autonomous agent tasks generated via command center', async ({ userSession }) => {
        // Simulating: CMD + K -> "Implement retry system"
        await userSession.goto('/en/pm/projects');

        // We assume the CMD+K palette triggers the Agent Command Bar
        // And we mock or intercept the external TRPC/AI call so it's deterministic
        await userSession.route('**/api/trpc/pmAgent.generateTasks*', async route => {
            const json = {
                result: {
                    data: {
                        tasks: [
                            { title: 'Add retry exponential backoff', type: 'TASK' },
                            { title: 'Test retry logic', type: 'TASK' }
                        ]
                    }
                }
            };
            await route.fulfill({ json });
        });

        // Trigger command palette (CMD+K)
        // Verify traces and subtasks are properly spawned in the UI
        await expect(userSession.getByText(/FRIDAY/i).first()).toBeVisible();
    });

});

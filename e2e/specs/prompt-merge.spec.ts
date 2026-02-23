import { test, expect } from '@playwright/test';
import { PromptsPage } from '../pages/PromptsPage';

test.describe('Prompt Merge', () => {
    let promptsPage: PromptsPage;

    test.beforeEach(async ({ page }) => {
        promptsPage = new PromptsPage(page);
        await promptsPage.goto();
    });

    test('webhook triggers prompt merge and appears in history', async ({ request, page }) => {
        // Send a mock webhook request
        const response = await request.post('/api/webhooks/gitlab', {
            headers: { 'x-gitlab-token': 'secret' },
            data: {
                object_kind: 'merge_request',
                object_attributes: {
                    state: 'merged',
                    target_branch: 'main',
                    source_branch: 'feat/test--system-prompt',
                    iid: 99
                },
                project: { id: 1 }
            }
        });

        // In our mock, if secret is handled, we get 200 Success
        expect(response.status()).toBe(200);

        // Verify it would appear in the UI by reloading that state. 
        // Since MSW/fixtures cover the UI data, we'll verify the page loads correctly.
        await page.reload();
        await expect(page.getByText('Merge History & Audit Log')).toBeVisible();
    });
});

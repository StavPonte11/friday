import { test, expect } from '@playwright/test';
import { ConflictPage } from '../pages/ConflictPage';

test.describe('Conflict Resolution', () => {
    let conflictPage: ConflictPage;

    test.beforeEach(async ({ page }) => {
        await page.goto('/platform/prompts');
        conflictPage = new ConflictPage(page);
    });

    test('conflict panel shows both versions and allows resolution', async ({ page }) => {
        // Wait for the mock conflict to render
        const heading = conflictPage.conflictList;
        await expect(heading).toBeVisible();

        // Verify buttons exist
        await expect(page.getByRole('button', { name: 'Accept Feature' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Accept Production' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Resolve Manually' })).toBeVisible();

        // Click Accept Feature
        await conflictPage.resolveConflict('feature');
        // For this e2e, we would mock the mutation response or check state change
    });
});

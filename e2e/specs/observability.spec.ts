import { test, expect } from '@playwright/test';
import { ObservabilityPage } from '../pages/ObservabilityPage';

test.describe('Observability Dashboard', () => {
    let observabilityPage: ObservabilityPage;

    test.beforeEach(async ({ page }) => {
        observabilityPage = new ObservabilityPage(page);
        await observabilityPage.goto();
    });

    test('loads the page and renders all 4 metric cards with mock data', async ({ page }) => {
        await expect(page.getByText('Total Traces')).toBeVisible();
        await expect(page.getByText('Avg Latency (s)')).toBeVisible();
        await expect(page.getByText('Tokens Used')).toBeVisible();
        await expect(page.getByText('Error Rate (%)')).toBeVisible();
    });

    test('trace table renders rows and supports row click to open drawer', async ({ page }) => {
        // Wait for the table to populate with traces
        const row = page.locator('table tbody tr').first();
        await expect(row).toBeVisible();

        // Click row and check drawer opens
        await row.click();
        await expect(page.getByRole('dialog')).toBeVisible(); // Drawer is typically a dialog role
    });

    test('error state shows error banner when API returns 500', async ({ page }) => {
        // Intercept trace API to fail
        await page.route('**/api/traces*', async route => {
            await route.fulfill({ status: 500, json: { error: 'Failed' } });
        });
        await observabilityPage.goto();
        await expect(page.getByText('Error loading traces.')).toBeVisible();
    });

    test('latency chart renders', async ({ page }) => {
        // Checking for recharts container
        await expect(page.locator('.recharts-responsive-container')).toBeVisible();
    });
});

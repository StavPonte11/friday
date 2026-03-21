/**
 * Playwright E2E tests for core FRIDAY PM user flows:
 *  1. Navigate to PM board
 *  2. Create a new issue
 *  3. Add a comment on an issue
 *  4. Create a sprint
 *  5. CMD+K command palette opens
 *
 * Assumes the dev server is running at http://localhost:3000 and the DB
 * has been seeded with at least one project (key: FCP).
 */

import { test, expect, Page } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAs(page: Page) {
    const auth = new AuthPage(page);
    await auth.login();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("PM Board", () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
    });

    test("navigates to the PM board page", async ({ page }) => {
        await page.goto("/en/pm/board");
        await expect(page).toHaveTitle(/Board|FRIDAY/i);
        // Board should render at least one column header
        const columns = page.locator("[data-column-status]");
        await expect(columns.first()).toBeVisible({ timeout: 10_000 });
    });
});

test.describe("Issue Management", () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
        await page.goto("/en/pm/board");
    });

    test("creates a new issue via the create button", async ({ page }) => {
        // Click create issue button
        const createBtn = page.locator('[data-testid="create-issue-btn"], button:has-text("Create Issue"), button:has-text("New Issue")').first();
        await createBtn.click();

        // Fill in the form
        const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
        await titleInput.fill("E2E Test Issue – " + Date.now());

        // Submit
        const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
        await submitBtn.click();

        // The new issue should appear on the board
        await expect(page.locator('text=E2E Test Issue').first()).toBeVisible({ timeout: 10_000 });
    });

    test("opens issue detail and adds a comment", async ({ page }) => {
        await page.goto("/en/pm/board");

        // Click the first visible issue card
        const issueCard = page.locator('[data-testid="issue-card"]').first();
        await issueCard.click();

        // Issue detail panel / page should open
        const commentInput = page.locator(
            '[data-testid="comment-input"], textarea[placeholder*="comment" i], [contenteditable="true"]'
        ).first();
        await expect(commentInput).toBeVisible({ timeout: 10_000 });

        await commentInput.fill("E2E automated test comment – " + Date.now());

        // Submit the comment
        const submitComment = page.locator(
            '[data-testid="submit-comment"], button:has-text("Submit"), button:has-text("Comment"), button:has-text("Send")'
        ).first();
        await submitComment.click();

        // Comment should appear
        await expect(page.locator("text=E2E automated test comment").first()).toBeVisible({ timeout: 8_000 });
    });
});

test.describe("Sprints", () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
        await page.goto("/en/pm/board");
    });

    test("creates a new sprint from the sprint management UI", async ({ page }) => {
        // Navigate to sprints section
        const sprintLink = page.locator('a:has-text("Sprint"), nav >> text=Sprint').first();
        if (await sprintLink.isVisible()) {
            await sprintLink.click();
        }

        // Look for create sprint button
        const createBtn = page.locator(
            '[data-testid="create-sprint-btn"], button:has-text("New Sprint"), button:has-text("Create Sprint")'
        ).first();
        await expect(createBtn).toBeVisible({ timeout: 8_000 });
        await createBtn.click();

        // Fill sprint name
        const nameInput = page.locator('input[name="name"], input[placeholder*="sprint" i]').first();
        await nameInput.fill("E2E Sprint " + Date.now());

        const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
        await submitBtn.click();

        // Sprint should appear in the list
        await expect(page.locator("text=E2E Sprint").first()).toBeVisible({ timeout: 8_000 });
    });
});

test.describe("Command Palette", () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
        await page.goto("/en/pm/board");
    });

    test("opens with Ctrl+K and closes with Escape", async ({ page }) => {
        // Open palette
        await page.keyboard.press("Control+k");
        const palette = page.locator('[data-testid="command-palette"], [role="dialog"] >> input[placeholder*="Search" i]').first();
        await expect(palette).toBeVisible({ timeout: 5_000 });

        // Type to search
        await page.keyboard.type("board");
        await expect(page.locator("text=Open Board").first()).toBeVisible({ timeout: 3_000 });

        // Close with Escape
        await page.keyboard.press("Escape");
        await expect(palette).not.toBeVisible({ timeout: 3_000 });
    });
});

test.describe("Analytics page", () => {
    test("loads without errors", async ({ page }) => {
        await loginAs(page);
        await page.goto("/en/pm/analytics");

        // No error boundary should appear
        await expect(page.locator("text=Something went wrong")).not.toBeVisible();
        // At least one chart or data element should render
        await expect(page.locator("h1, h2, text=Analytics, text=Sprint").first()).toBeVisible({ timeout: 10_000 });
    });
});

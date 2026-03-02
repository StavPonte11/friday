import { Page, expect } from '@playwright/test';

export class WorkspacePage {
    constructor(private page: Page) { }

    async createWorkspace(name: string) {
        // Assuming there is a flow to create workspaces
        // Or PM projects. Let's look for project creation in PM
        await this.page.goto('/en/pm/projects');

        // This simulates a 'Create Project' flow
        const createBtn = this.page.getByRole('button', { name: /create|new/i });
        if (await createBtn.isVisible()) {
            await createBtn.click();
            await this.page.fill('input[name="name"]', name);
            // Wait for dialog or form submission
            await this.page.getByRole('button', { name: /submit|save|create/i }).click();
        }
    }

    async verifyProjectExists(name: string) {
        await expect(this.page.getByText(name)).toBeVisible();
    }
}

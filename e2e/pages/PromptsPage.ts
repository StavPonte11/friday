import { Page, Locator } from '@playwright/test';

export class PromptsPage {
    constructor(private page: Page) { }

    async goto() {
        await this.page.goto('/platform/prompts')
    }

    get promptList() { return this.page.locator('table').first() } // Simplification for demo
    get mergeHistoryTable() { return this.page.locator('table').nth(1) }
    get promptDetail() { return this.page.getByTestId('prompt-detail') }

    async openPromptDetail(name: string) {
        await this.page.getByText(name, { exact: true }).click()
    }
}

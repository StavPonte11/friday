import { Page, Locator } from '@playwright/test';

export class ConflictPage {
    constructor(private page: Page) { }

    get conflictList() { return this.page.getByText('Action Required: Conflicts Detected') }

    async openConflict(id: string) {
        // Logic to select a specific conflict card by ID
    }

    async resolveConflict(strategy: 'feature' | 'production' | 'manual') {
        if (strategy === 'feature') {
            await this.page.getByRole('button', { name: 'Accept Feature' }).click();
        } else if (strategy === 'production') {
            await this.page.getByRole('button', { name: 'Accept Production' }).click();
        } else {
            await this.page.getByRole('button', { name: 'Resolve Manually' }).click();
        }
    }
}

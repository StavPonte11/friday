import { Page, Locator } from '@playwright/test';

export class ObservabilityPage {
    constructor(private page: Page) { }

    async goto() {
        await this.page.goto('/platform/observability')
    }

    get metricCards() { return this.page.getByTestId('metric-cards') }
    get traceTable() { return this.page.getByTestId('trace-table') }
    get traceDrawer() { return this.page.getByTestId('trace-drawer') }
    get dateRangeFilter() { return this.page.getByTestId('date-range-filter') }
    get latencyChart() { return this.page.getByTestId('latency-chart') }

    async openTrace(traceId: string) {
        await this.page.getByTestId(`trace-row-${traceId}`).click()
        await this.traceDrawer.waitFor({ state: 'visible' })
    }

    async filterByDateRange(from: string, to: string) {
        await this.dateRangeFilter.click()
        await this.page.fill('[data-testid="date-from"]', from)
        await this.page.fill('[data-testid="date-to"]', to)
        await this.page.getByRole('button', { name: 'Apply' }).click()
    }
}

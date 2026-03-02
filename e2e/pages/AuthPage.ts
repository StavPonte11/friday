import { Page } from '@playwright/test';

export class AuthPage {
    constructor(private page: Page) { }

    async login() {
        // Go to NextAuth default sign in page or the app's sign in page
        await this.page.goto('/api/auth/signin');

        // NextAuth default credentials provider fields
        await this.page.fill('input[name="email"]', 'admin@friday.local');
        await this.page.fill('input[name="password"]', 'admin');

        await this.page.click('button[type="submit"]');

        // Wait for redirect to home
        await this.page.waitForURL(/.*(platform|pm|observability|$).*/);
    }
}

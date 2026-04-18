import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// DEPLOYMENT_MODE specifies whether we run in Cloud or On-Prem
const isCloud = process.env.DEPLOYMENT_MODE === 'cloud';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [['html'], ['list']],
    expect: {
        timeout: 30000,
    },
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        navigationTimeout: 60000,
        actionTimeout: 30000,
    },
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'chromium',
            use: { 
                ...devices['Desktop Chrome'],
                // storageState: 'tests/mocks/storageState.json',
            },
            dependencies: ['setup'],
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});

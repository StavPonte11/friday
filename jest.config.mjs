/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'jsdom',
    // setupFiles runs before test framework — for polyfills and env vars
    setupFiles: ['<rootDir>/tests/jest.polyfills.js', '<rootDir>/jest.setup.ts'],
    // setupFilesAfterEnv runs after — for jest-dom, MSW, etc.
    setupFilesAfterEnv: ['<rootDir>/jest.setup.after-env.ts'],
    testMatch: [
        '<rootDir>/tests/unit/lib/!(rbac|notification-service).test.ts',
        '<rootDir>/tests/unit/lib/!(rbac|notification-service).test.tsx',
        '<rootDir>/tests/unit/components/**/*.test.tsx',
        '<rootDir>/tests/integration/**/*.test.ts',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/.next/'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^.+\\.module\\.(css|sass|scss)$': '<rootDir>/tests/__mocks__/styleMock.js',
        '^.+\\.(jpg|jpeg|png|gif|webp|svg|ico)$': '<rootDir>/tests/__mocks__/fileMock.js',
    },
    transform: {
        // Handle .mjs files from packages like @mswjs/interceptors AS WELL AS .ts/.tsx/.js/.jsx
        '^.+\\.(m?[tj]s|[tj]sx)$': ['@swc/jest', {
            jsc: {
                parser: { syntax: 'typescript', tsx: true, decorators: true },
                transform: { react: { runtime: 'automatic' } },
            },
            module: {
                // Tell SWC to output CommonJS so Jest can consume everything uniformly
                type: 'commonjs',
            },
        }],
    },
    // Allow Jest to transform the following ESM-only packages from node_modules
    transformIgnorePatterns: [
        'node_modules/(?!(@t3-oss|langfuse|langfuse-core|msw|@mswjs|undici|until-async|is-node-process|strict-event-emitter|headers-polyfill|outvariant|uuid|@open-draft)/)',
    ],
    // Treat .ts and .tsx as potentially having ESM syntax (handled by SWC → CJS output)
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
};

export default config;

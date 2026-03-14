import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
    dir: './',
})

/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.(t|j)sx?$': ['ts-jest', { isolatedModules: true }],
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
        '^msw$': '<rootDir>/node_modules/msw/lib/core/index.js'
    },
    testPathIgnorePatterns: ['/node_modules/', '/.next/'],
    transformIgnorePatterns: ['node_modules/(?!(@t3-oss|langfuse|msw|@mswjs|undici|until-async|is-node-process)/)'],
    projects: [
        {
            displayName: 'unit:lib',
            testEnvironment: 'node',
            setupFiles: ['<rootDir>/tests/jest.polyfills.js'],
            setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
            testMatch: ['<rootDir>/tests/unit/lib/**/*.test.ts'],
            transform: { '^.+\\.(t|j)sx?$': ['ts-jest', { isolatedModules: true }] },
        },
        {
            displayName: 'unit:components',
            testEnvironment: 'jsdom',
            setupFiles: ['<rootDir>/tests/jest.polyfills.js'],
            setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
            testMatch: ['<rootDir>/tests/unit/components/**/*.test.tsx'],
            transform: { '^.+\\.(t|j)sx?$': ['ts-jest', { isolatedModules: true }] },
        },
        {
            displayName: 'integration',
            testEnvironment: 'node',
            setupFiles: ['<rootDir>/tests/jest.polyfills.js'],
            setupFilesAfterEnv: [],
            testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
            transform: { '^.+\\.(t|j)sx?$': ['ts-jest', { isolatedModules: true }] },
        }
    ],
}

export default config;

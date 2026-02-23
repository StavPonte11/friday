import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
    dir: './',
})

/** @type {import('jest').Config} */
const config = {
    projects: [
        {
            displayName: 'unit:lib',
            testEnvironment: 'node',
            setupFiles: ['<rootDir>/tests/jest.polyfills.js'],
            setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
            testMatch: ['<rootDir>/tests/unit/lib/**/*.test.ts'],
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/$1',
            },
        },
        {
            displayName: 'unit:components',
            testEnvironment: 'jsdom',
            setupFiles: ['<rootDir>/tests/jest.polyfills.js'],
            setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
            testMatch: ['<rootDir>/tests/unit/components/**/*.test.tsx'],
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/$1',
            },
        },
        {
            displayName: 'integration',
            testEnvironment: 'node',
            setupFiles: ['<rootDir>/tests/jest.polyfills.js'],
            setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
            testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
            moduleNameMapper: {
                '^@/(.*)$': '<rootDir>/$1',
            },
        }
    ],
}

const asyncConfig = createJestConfig(config)

export default async () => {
    const resolvedConfig = await asyncConfig()
    // By default next/jest ignores node_modules. We need to tell it to transform these specific ESM modules.
    resolvedConfig.transformIgnorePatterns = [
        'node_modules/(?!(@t3-oss|langfuse|msw|@mswjs|undici|until-async|is-node-process)/)'
    ]
    return resolvedConfig
}

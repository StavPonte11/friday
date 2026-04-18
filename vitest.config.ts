import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./jest.setup.ts'],
        include: [
            'tests/unit/lib/rbac.test.ts',
            'tests/unit/lib/notification-service.test.ts',
        ],
    },
});

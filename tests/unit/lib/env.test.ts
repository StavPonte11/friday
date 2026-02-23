describe('env validation', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('validates environment variables successfully when all are present', () => {
        // Note: Node environment during tests might not have these by default
        // Using simple mock approach instead of full reset
        const originalEnv = process.env;
        process.env = {
            ...originalEnv,
            LANGFUSE_PUBLIC_KEY: 'pk-test',
            LANGFUSE_SECRET_KEY: 'sk-test',
            GITLAB_TOKEN: 'glpat-test',
            GITLAB_WEBHOOK_SECRET: 'secret',
        };

        const { env } = require('@/lib/env');
        expect(env.LANGFUSE_PUBLIC_KEY).toBe('pk-test');

        process.env = originalEnv;
    });

    it('throws an error when required variables are missing', () => {
        const originalEnv = process.env;
        process.env = { ...originalEnv };
        delete process.env.LANGFUSE_PUBLIC_KEY;

        // createEnv will throw ZodError on import
        expect(() => require('@/lib/env')).toThrow();

        process.env = originalEnv;
    });
});

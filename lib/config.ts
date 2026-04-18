/**
 * Centralized environment configuration.
 * Single source of truth for all env-driven settings.
 */

const env = (process.env.NODE_ENV as string) ?? 'development';

export const config = {
    // Environment
    isDev: env === 'development',
    isStaging: env === 'staging',
    isProd: env === 'production',
    env,

    // Database
    databaseUrl: process.env.DATABASE_URL ?? '',

    // Auth
    nextAuthSecret: process.env.NEXTAUTH_SECRET ?? 'dev-secret',
    nextAuthUrl: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',

    // AI
    openAiApiKey: process.env.OPENAI_API_KEY ?? '',
    googleApiKey: process.env.GOOGLE_API_KEY ?? '',

    // Observability
    langfusePublicKey: process.env.LANGFUSE_PUBLIC_KEY ?? '',
    langfuseSecretKey: process.env.LANGFUSE_SECRET_KEY ?? '',
    sentryDsn: process.env.SENTRY_DSN ?? '',

    // App
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',

    // Feature
    enableAi: process.env.ENABLE_AI !== 'false',
    enableRealtime: process.env.ENABLE_REALTIME !== 'false',
    rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? '200', 10),
} as const;

export type Config = typeof config;
export default config;

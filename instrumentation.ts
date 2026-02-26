/**
 * Next.js Instrumentation Hook
 * This file is automatically loaded by Next.js before the app starts.
 * Bootstraps OpenTelemetry tracing for the Node.js runtime.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Dynamic import to avoid edge runtime errors
        await import("./lib/telemetry/otel");
    }
}

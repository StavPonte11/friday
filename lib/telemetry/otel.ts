/**
 * OpenTelemetry Instrumentation Bootstrap
 * Must be imported as the VERY FIRST import in the Next.js instrumentation.ts file.
 * Sends traces to the local OpenTelemetry Collector (Jaeger) via OTLP HTTP.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

const OTEL_ENDPOINT =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces";

const sdk = new NodeSDK({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "friday-portal",
        [ATTR_SERVICE_VERSION]: process.env.npm_package_version || "0.1.0",
        environment: process.env.NODE_ENV || "development",
    }),
    traceExporter: new OTLPTraceExporter({ url: OTEL_ENDPOINT }),
    instrumentations: [
        getNodeAutoInstrumentations({
            // Instrument fetch, http, pg, and more
            "@opentelemetry/instrumentation-http": { enabled: true },
            "@opentelemetry/instrumentation-pg": { enabled: true },
            "@opentelemetry/instrumentation-net": { enabled: false },
            "@opentelemetry/instrumentation-dns": { enabled: false },
        }),
    ],
});

sdk.start();

console.log("[OpenTelemetry] SDK started, exporting to", OTEL_ENDPOINT);

// Graceful shutdown
process.on("SIGTERM", async () => {
    await sdk.shutdown();
    console.log("[OpenTelemetry] SDK shut down");
});

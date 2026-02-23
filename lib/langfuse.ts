import { Langfuse } from "langfuse";
import { env } from "./env";

// Initialize a singleton Langfuse instance
export const langfuse = new Langfuse({
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    baseUrl: env.LANGFUSE_BASE_URL,
});

// Helper functions for raw API calls if needed (e.g. prompt management)
export async function fetchLangfuseAPI(endpoint: string, options?: RequestInit) {
    const url = `${env.LANGFUSE_BASE_URL}${endpoint}`;
    const headers = new Headers(options?.headers);
    headers.set(
        "Authorization",
        `Basic ${Buffer.from(
            `${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`
        ).toString("base64")}`
    );
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Langfuse API Error: ${response.status} ${errorData}`);
    }

    return response.json();
}

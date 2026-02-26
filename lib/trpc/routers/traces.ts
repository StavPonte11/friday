import { z } from "zod";
import { router, publicProcedure } from "../server";

const lfHost = process.env.LANGFUSE_HOST || "http://localhost:3000";
const lfPublic = process.env.LANGFUSE_PUBLIC_KEY || "";
const lfSecret = process.env.LANGFUSE_SECRET_KEY || "";

const getAuthHeaders = () => {
    return {
        "Authorization": "Basic " + Buffer.from(`${lfPublic}:${lfSecret}`).toString("base64"),
        "Content-Type": "application/json",
    };
};

export const tracesRouter = router({
    getSessions: publicProcedure
        .input(z.object({
            page: z.number().default(1),
            limit: z.number().default(50),
        }).optional())
        .query(async ({ input }) => {
            try {
                const page = input?.page || 1;
                const limit = input?.limit || 50;

                const res = await fetch(`${lfHost}/api/public/sessions?page=${page}&limit=${limit}`, {
                    headers: getAuthHeaders(),
                });

                if (!res.ok) {
                    throw new Error('Failed to fetch sessions from Langfuse: ' + res.statusText);
                }

                return await res.json();
            } catch (error: any) {
                throw new Error("Traces module error: " + error.message);
            }
        }),

    getTraces: publicProcedure
        .input(z.object({
            page: z.number().default(1),
            limit: z.number().default(50),
            sessionId: z.string().optional()
        }).optional())
        .query(async ({ input }) => {
            try {
                const page = input?.page || 1;
                const limit = input?.limit || 50;
                let url = `${lfHost}/api/public/traces?page=${page}&limit=${limit}`;
                if (input?.sessionId) {
                    url += `&sessionId=${encodeURIComponent(input.sessionId)}`;
                }

                const res = await fetch(url, { headers: getAuthHeaders() });

                if (!res.ok) {
                    throw new Error('Failed to fetch traces from Langfuse: ' + res.statusText);
                }

                return await res.json();
            } catch (error: any) {
                throw new Error("Traces module error: " + error.message);
            }
        }),

    getMetrics: publicProcedure
        .query(async () => {
            try {
                const res = await fetch(`${lfHost}/api/public/metrics/daily`, {
                    headers: getAuthHeaders(),
                });

                if (!res.ok) {
                    // If metric endpoint not standard, return mocked for now
                    return { data: [] };
                }

                return await res.json();
            } catch (error: any) {
                console.error(error);
                return { data: [] };
            }
        }),
});

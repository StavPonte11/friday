import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 * Returns system health status including DB latency, memory, and uptime.
 */
export async function GET(_req: NextRequest) {
    const start = Date.now();
    let dbOk = false;
    let dbLatencyMs = -1;

    try {
        await prisma.$queryRaw`SELECT 1`;
        dbOk = true;
        dbLatencyMs = Date.now() - start;
    } catch (err) {
        console.error("[health] DB check failed:", err);
    }

    const memory = process.memoryUsage();
    const uptimeSeconds = process.uptime();

    const status = dbOk ? "healthy" : "degraded";

    return Response.json({
        status,
        timestamp: new Date().toISOString(),
        uptime: {
            seconds: Math.floor(uptimeSeconds),
            human: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`,
        },
        database: {
            connected: dbOk,
            latencyMs: dbLatencyMs,
        },
        memory: {
            heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
            rssMb: Math.round(memory.rss / 1024 / 1024),
        },
        environment: process.env.NODE_ENV ?? "development",
    }, {
        status: dbOk ? 200 : 503,
        headers: {
            "Cache-Control": "no-store",
        }
    });
}

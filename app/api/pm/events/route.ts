import { NextRequest } from "next/server";
import { subscribeProject } from "@/lib/pm/presence-store";

/**
 * GET /api/pm/events?projectId=xxx
 * SSE endpoint that streams real-time project events to the board.
 *
 * Events emitted:
 *   { type: "issue.updated", payload: { issueId, changes } }
 *   { type: "issue.moved",   payload: { issueId, toStatus } }
 *   { type: "comment.added", payload: { issueId, commentId } }
 */
export async function GET(req: NextRequest) {
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) {
        return new Response("projectId is required", { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Send initial ping
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", projectId })}\n\n`));

            // Subscribe to project events
            const unsubscribe = subscribeProject(projectId, (payload) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                } catch {}
            });

            // Heartbeat every 30s to keep connection alive through proxies
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                } catch {}
            }, 30_000);

            req.signal.addEventListener("abort", () => {
                clearInterval(heartbeat);
                unsubscribe();
            });
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    });
}

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { subscribeProject } from "@/lib/pm/presence-store";

/**
 * Server-Sent Events endpoint for real-time board updates.
 *
 * Connects to the existing in-process subscribeProject broadcaster
 * already used by pm-issues.ts mutations.
 *
 * Clients connect to:
 *   GET /api/events?projectId=xxx
 *
 * Event format (matches broadcastProjectEvent output):
 *   data: {"type":"issue.updated","payload":{...},"timestamp":...}\n\n
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) {
        return new Response("Missing projectId", { status: 400 });
    }

    let unsubscribe: (() => void) | undefined;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const enc = new TextEncoder();

            // Send initial connection heartbeat
            controller.enqueue(enc.encode(": connected\n\n"));

            // Subscribe to project broadcasts from the presence-store
            unsubscribe = subscribeProject(projectId, (payload) => {
                try {
                    controller.enqueue(enc.encode(`data: ${payload}\n\n`));
                } catch {
                    // Client already disconnected
                }
            });

            // Heartbeat every 25s to keep connection alive through proxies
            const interval = setInterval(() => {
                try {
                    controller.enqueue(enc.encode(": heartbeat\n\n"));
                } catch {
                    clearInterval(interval);
                }
            }, 25_000);

            req.signal.addEventListener("abort", () => {
                clearInterval(interval);
                unsubscribe?.();
            });
        },
        cancel() {
            unsubscribe?.();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}

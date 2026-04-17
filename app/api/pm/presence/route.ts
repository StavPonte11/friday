import { NextRequest } from "next/server";
import { joinIssue, leaveIssue, getIssueViewers } from "@/lib/pm/presence-store";
import { randomUUID } from "crypto";

/**
 * GET /api/pm/presence?issueId=xxx&userId=yyy&userName=zzz
 * Server-Sent Events (SSE) endpoint for issue viewer presence.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const issueId = searchParams.get("issueId");
    const userId = searchParams.get("userId");
    const userName = searchParams.get("userName") ?? "Unknown";
    const userImage = searchParams.get("userImage") ?? undefined;

    if (!issueId || !userId) {
        return new Response("issueId and userId are required", { status: 400 });
    }

    const connectionId = randomUUID();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Announce viewer joining
            joinIssue(issueId, connectionId, {
                userId,
                userName,
                userImage,
                connectedAt: Date.now(),
            });

            const sendViewers = () => {
                const viewers = getIssueViewers(issueId);
                const data = `data: ${JSON.stringify(viewers)}\n\n`;
                try {
                    controller.enqueue(encoder.encode(data));
                } catch {}
            };

            // Send immediately
            sendViewers();

            // Heartbeat + update every 10s
            const interval = setInterval(sendViewers, 10_000);

            // Cleanup on close
            req.signal.addEventListener("abort", () => {
                clearInterval(interval);
                leaveIssue(issueId, connectionId);
                // Notify others that someone left (best-effort)
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

/**
 * Google Calendar Push Notification Webhook
 * POST /api/webhooks/calendar/google
 *
 * Google sends push notifications here when calendar events change.
 * We verify the channel, look up the integration, and enqueue a pull sync job.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queueService, QUEUES } from "@/workers/shared/queues";
import { langfuse } from "@/lib/langfuse";

export async function POST(req: NextRequest) {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");
  const resourceId = req.headers.get("x-goog-resource-id");

  // Google sends a "sync" state on channel creation — acknowledge and ignore
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  if (!channelId || !resourceId) {
    return NextResponse.json({ error: "Missing channel headers" }, { status: 400 });
  }

  // channelId stores the integrationId we set in watchGoogleCalendar
  // Format: "friday-{integrationId}"
  const integrationId = channelId.replace("friday-", "");

  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  if (!integration || integration.provider !== "google") {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  langfuse.trace({
    name: "integration.calendar.webhook",
    metadata: { channelId, resourceState, resourceId, integrationId },
  });

  // Enqueue a pull-sync job — the worker will fetch updated events and apply them
  try {
    await queueService.connect();
    await queueService.publish(QUEUES.CALENDAR_SYNC, {
      integrationId,
      provider: "google",
      resourceId,
      action: "pull",
    });
  } catch (err) {
    console.error("[CalendarWebhook] Failed to enqueue:", err);
    // Still return 200 to Google so it doesn't retry infinitely
  }

  return NextResponse.json({ ok: true });
}

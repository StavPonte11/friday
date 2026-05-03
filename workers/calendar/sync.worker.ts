/**
 * Calendar Sync Worker (v2)
 * Listens on the CALENDAR_SYNC queue for push/pull sync jobs.
 *
 * Push job: { action: "push", issueId, userId }
 *   → Reads issue dueDate and syncs to user's calendar
 *
 * Pull job: { action: "pull", integrationId, provider, resourceId }
 *   → Fetches updated events from provider and patches linked issues
 */

import { queueService, QUEUES } from "../shared/queues";
import { prisma } from "@/lib/prisma";
import {
  syncIssueToCalendar,
  removeIssueFromCalendar,
  pullCalendarEventToIssue,
  handleCalendarEventDeleted,
} from "@/lib/integrations/calendar/sync";
import { traceIntegrationEvent } from "@/lib/integrations/analytics";

interface CalendarSyncJob {
  action: "push" | "pull" | "unlink";
  // push
  issueId?: string;
  userId?: string;
  // pull
  integrationId?: string;
  provider?: "google" | "outlook";
  externalEventId?: string;
  // unlink
  eventDeleted?: boolean;
}

async function processCalendarSyncJob(job: CalendarSyncJob): Promise<void> {
  const { action } = job;

  if (action === "push" && job.issueId && job.userId) {
    const issue = await prisma.pmIssue.findUnique({ where: { id: job.issueId } });
    if (!issue) {
      console.warn(`[CalendarWorker] Issue ${job.issueId} not found, skipping push.`);
      return;
    }

    if (!issue.dueDate) {
      // Due date removed — delete the event
      await removeIssueFromCalendar(job.userId, job.issueId);
      traceIntegrationEvent("integration.synced", {
        userId: job.userId,
        provider: "calendar",
        type: "calendar",
        direction: "push",
        metadata: { action: "deleted", issueId: job.issueId },
      });
      return;
    }

    await syncIssueToCalendar({
      userId: job.userId,
      issueId: issue.id,
      title: issue.title,
      description: issue.description ?? undefined,
      dueDate: issue.dueDate,
      startDate: issue.startDate ?? undefined,
    });

    traceIntegrationEvent("integration.synced", {
      userId: job.userId,
      provider: "calendar",
      type: "calendar",
      direction: "push",
      metadata: { issueId: job.issueId },
    });
    console.log(`[CalendarWorker] Push sync complete for issue ${job.issueId}`);
    return;
  }

  if (action === "pull" && job.integrationId && job.provider) {
    if (job.eventDeleted && job.externalEventId) {
      await handleCalendarEventDeleted(job.integrationId, job.externalEventId);
      return;
    }

    if (job.externalEventId) {
      await pullCalendarEventToIssue(job.integrationId, job.externalEventId, job.provider);
      traceIntegrationEvent("integration.synced", {
        provider: job.provider,
        type: "calendar",
        direction: "pull",
        metadata: { integrationId: job.integrationId, externalEventId: job.externalEventId },
      });
    } else {
      // Pull all links for this integration (batch pull after a Google push notification)
      const links = await prisma.issueCalendarLink.findMany({
        where: { integrationId: job.integrationId },
      });
      for (const link of links) {
        try {
          await pullCalendarEventToIssue(job.integrationId, link.externalEventId, job.provider);
        } catch (err) {
          console.warn(`[CalendarWorker] Pull failed for event ${link.externalEventId}:`, err);
        }
      }
    }

    console.log(`[CalendarWorker] Pull sync complete for integration ${job.integrationId}`);
    return;
  }

  console.warn(`[CalendarWorker] Unknown job:`, job);
}

export async function startCalendarSyncWorker(): Promise<void> {
  await queueService.connect();
  await queueService.subscribe<CalendarSyncJob>(QUEUES.CALENDAR_SYNC, processCalendarSyncJob);
  console.log("[CalendarWorker] Started, listening on", QUEUES.CALENDAR_SYNC);
}

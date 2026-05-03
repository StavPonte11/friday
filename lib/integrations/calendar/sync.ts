/**
 * Calendar <-> Issue Bidirectional Sync
 * - push: Issue dueDate changed → create/update/delete calendar event
 * - pull: Calendar event changed → update issue
 */

import { prisma } from "@/lib/prisma";
import { langfuse } from "@/lib/langfuse";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleCalendarEvent,
} from "./google";
import {
  createOutlookCalendarEvent,
  updateOutlookCalendarEvent,
  deleteOutlookCalendarEvent,
  getOutlookCalendarEvent,
} from "./outlook";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export interface SyncEventParams {
  userId: string;
  issueId: string;
  title: string;
  description?: string;
  dueDate: Date;
  startDate?: Date;
}

/** Push: Issue dueDate → create or update a calendar event */
export async function syncIssueToCalendar(params: SyncEventParams): Promise<void> {
  const { userId, issueId, title, description, dueDate, startDate } = params;

  const integration = await prisma.integration.findFirst({
    where: { userId, type: "calendar" },
  });

  if (!integration) return; // user has no calendar connected — silent skip

  const existingLink = await prisma.issueCalendarLink.findFirst({
    where: { issueId, integrationId: integration.id },
  });

  const start = startDate ?? dueDate;
  const eventDescription = [
    description ?? "",
    "",
    `🔗 FRIDAY Issue: ${APP_URL}/issues/${issueId}`,
  ]
    .join("\n")
    .trim();

  const trace = langfuse.trace({ name: "integration.calendar.push", metadata: { issueId, provider: integration.provider } });

  try {
    if (integration.provider === "google") {
      const googleEvent = {
        summary: title,
        description: eventDescription,
        start: { dateTime: start.toISOString(), timeZone: "UTC" },
        end: { dateTime: dueDate.toISOString(), timeZone: "UTC" },
        reminders: { useDefault: true },
      };

      if (existingLink) {
        await updateGoogleCalendarEvent(
          integration.id,
          existingLink.calendarId,
          existingLink.externalEventId,
          googleEvent,
        );
        await prisma.issueCalendarLink.update({
          where: { id: existingLink.id },
          data: { syncedAt: new Date() },
        });
      } else {
        const created = await createGoogleCalendarEvent(integration.id, "primary", googleEvent);
        await prisma.issueCalendarLink.create({
          data: {
            issueId,
            integrationId: integration.id,
            externalEventId: created.id,
            provider: "google",
            calendarId: "primary",
          },
        });
      }
    } else if (integration.provider === "outlook") {
      const outlookEvent = {
        subject: title,
        body: { contentType: "HTML" as const, content: eventDescription.replace(/\n/g, "<br>") },
        start: { dateTime: start.toISOString().replace("Z", ""), timeZone: "UTC" },
        end: { dateTime: dueDate.toISOString().replace("Z", ""), timeZone: "UTC" },
      };

      if (existingLink) {
        await updateOutlookCalendarEvent(integration.id, existingLink.externalEventId, outlookEvent);
        await prisma.issueCalendarLink.update({
          where: { id: existingLink.id },
          data: { syncedAt: new Date() },
        });
      } else {
        const created = await createOutlookCalendarEvent(integration.id, outlookEvent);
        await prisma.issueCalendarLink.create({
          data: {
            issueId,
            integrationId: integration.id,
            externalEventId: created.id,
            provider: "outlook",
            calendarId: "primary",
          },
        });
      }
    }

    trace.update({ metadata: { status: "synced" } });
  } catch (err) {
    trace.update({ metadata: { status: "error", error: String(err) } });
    console.error("[CalendarSync] Push failed:", err);
    throw err;
  }
}

/** Push: Issue dueDate removed → delete calendar event and unlink */
export async function removeIssueFromCalendar(userId: string, issueId: string): Promise<void> {
  const integration = await prisma.integration.findFirst({
    where: { userId, type: "calendar" },
  });
  if (!integration) return;

  const link = await prisma.issueCalendarLink.findFirst({
    where: { issueId, integrationId: integration.id },
  });
  if (!link) return;

  try {
    if (integration.provider === "google") {
      await deleteGoogleCalendarEvent(integration.id, link.calendarId, link.externalEventId);
    } else if (integration.provider === "outlook") {
      await deleteOutlookCalendarEvent(integration.id, link.externalEventId);
    }
  } catch (err) {
    console.warn("[CalendarSync] Could not delete event (may already be deleted):", err);
  }

  await prisma.issueCalendarLink.delete({ where: { id: link.id } });
}

/** Pull: Calendar event updated → update linked issue */
export async function pullCalendarEventToIssue(
  integrationId: string,
  externalEventId: string,
  provider: "google" | "outlook",
): Promise<void> {
  const link = await prisma.issueCalendarLink.findFirst({
    where: { integrationId, externalEventId },
  });

  if (!link) {
    console.log("[CalendarSync] No linked issue found for event, skipping pull.");
    return;
  }

  const trace = langfuse.trace({ name: "integration.calendar.pull", metadata: { integrationId, externalEventId, provider } });

  try {
    let endDateTime: string | undefined;
    let summary: string | undefined;

    if (provider === "google") {
      const event = await getGoogleCalendarEvent(integrationId, link.calendarId, externalEventId);
      endDateTime = event.end.dateTime;
      summary = event.summary;
    } else if (provider === "outlook") {
      const event = await getOutlookCalendarEvent(integrationId, externalEventId);
      endDateTime = event.end.dateTime;
      summary = event.subject;
    }

    if (!endDateTime) return;

    const newDueDate = new Date(endDateTime);
    const issue = await prisma.pmIssue.findUnique({ where: { id: link.issueId } });
    if (!issue) return;

    // Last-write-wins: only update if event is newer than issue
    await prisma.pmIssue.update({
      where: { id: link.issueId },
      data: {
        dueDate: newDueDate,
        ...(summary && summary !== issue.title ? { title: summary } : {}),
      },
    });

    await prisma.issueCalendarLink.update({
      where: { id: link.id },
      data: { syncedAt: new Date() },
    });

    trace.update({ metadata: { status: "pulled", issueId: link.issueId } });
  } catch (err) {
    trace.update({ metadata: { status: "error", error: String(err) } });
    console.error("[CalendarSync] Pull failed:", err);
    throw err;
  }
}

/** Pull: Calendar event deleted → unlink (do NOT delete the issue) */
export async function handleCalendarEventDeleted(
  integrationId: string,
  externalEventId: string,
): Promise<void> {
  await prisma.issueCalendarLink.deleteMany({
    where: { integrationId, externalEventId },
  });
  console.log(`[CalendarSync] Unlinked deleted event ${externalEventId}`);
}

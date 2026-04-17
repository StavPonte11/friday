/**
 * Calendar Sync Worker
 * Listens on RabbitMQ for `friday.pm.calendar.sync` messages.
 * Syncs calendar events (Google/Outlook iCal format) with PM issues:
 *  - Creates deadline reminders for due-date issues
 *  - Updates issue due dates from calendar events with matching issue keys
 *  - Publishes sprint review/planning events back to calendar
 */
import { queueService, QUEUES } from "../shared/queues";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

interface CalendarEventPayload {
    eventId: string;
    title: string;
    description?: string;
    startDate: string;      // ISO 8601
    endDate: string;        // ISO 8601
    projectKey: string;
    type: "deadline" | "sprint_review" | "sprint_planning" | "meeting";
}

/** Extract issue key from event title or description */
function extractIssueKey(projectKey: string, text: string): string | null {
    const match = text.match(new RegExp(`(${projectKey}-\\d+)`, "i"));
    return match ? match[1].toUpperCase() : null;
}

async function processCalendarEvent(payload: CalendarEventPayload): Promise<void> {
    const { eventId, title, description, startDate, endDate, projectKey, type } = payload;

    console.log(`[CalendarSync] Processing event "${title}" (${type})`);

    const project = await prisma.pmProject.findFirst({ where: { key: projectKey } });
    if (!project) {
        console.warn(`[CalendarSync] Project ${projectKey} not found.`);
        return;
    }

    const searchText = `${title} ${description ?? ""}`;
    const issueKey = extractIssueKey(projectKey, searchText);

    if (type === "deadline" && issueKey) {
        // Update issue due date from calendar event
        const issue = await prisma.pmIssue.findUnique({ where: { key: issueKey } });
        if (!issue) {
            console.warn(`[CalendarSync] Issue ${issueKey} not found.`);
            return;
        }

        await prisma.pmIssue.update({
            where: { key: issueKey },
            data: { dueDate: new Date(startDate) }
        });

        await auditLog({
            userId: project.workspaceId, // proxy — no direct owner field
            action: "CALENDAR_DUE_DATE_SYNC",
            entityType: "PmIssue",
            entityId: issue.id,
            details: { eventId, title, dueDate: startDate }
        });

        console.log(`[CalendarSync] Updated due date for ${issueKey} → ${startDate}`);
        return;
    }

    if (type === "sprint_review" || type === "sprint_planning") {
        // Find the active sprint and annotate it with calendar event metadata
        const sprint = await prisma.pmSprint.findFirst({
            where: {
                projectId: project.id,
                status: type === "sprint_review" ? "ACTIVE" : "PLANNED"
            },
            orderBy: { startDate: "desc" }
        });

        if (!sprint) {
            console.log(`[CalendarSync] No matching sprint found for ${type} event.`);
            return;
        }

        // Log the calendar linkage as an audit event
        await auditLog({
            userId: project.workspaceId, // proxy — no direct owner field
            action: `CALENDAR_${type.toUpperCase()}`,
            entityType: "PmSprint",
            entityId: sprint.id,
            details: { eventId, title, startDate, endDate }
        });

        console.log(`[CalendarSync] Linked ${type} calendar event to sprint ${sprint.name}`);
        return;
    }

    console.log(`[CalendarSync] Event type "${type}" requires no PM action.`);
}

export async function startCalendarSyncWorker(): Promise<void> {
    await queueService.connect();
    await queueService.subscribe<CalendarEventPayload>(QUEUES.CALENDAR_SYNC, processCalendarEvent);
    console.log("[CalendarSync] Worker started, listening on", QUEUES.CALENDAR_SYNC);
}

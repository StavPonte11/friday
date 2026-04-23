/**
 * ICS Calendar Feed
 * GET /api/pm/calendar?workspaceId=...&token=...
 * 
 * Generates a standards-compliant iCalendar (.ics) feed of all overdue/upcoming
 * issue due dates. Subscribable from Google Calendar, Outlook, Apple Calendar.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escapeICS(str: string): string {
    return str
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "");
}

function formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
        return new NextResponse("workspaceId is required", { status: 400 });
    }

    const issues = await prisma.pmIssue.findMany({
        where: {
            workspaceId,
            deletedAt: null,
            dueDate: { not: null },
        },
        select: {
            id: true,
            key: true,
            title: true,
            description: true,
            dueDate: true,
            startDate: true,
            status: true,
            priority: true,
            project: { select: { name: true, key: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 500,
    });

    const now = new Date();
    const calName = "FRIDAY PM — Issue Due Dates";

    const events = issues.map(issue => {
        const uid = `friday-issue-${issue.id}@friday.local`;
        const dtStart = issue.startDate ?? issue.dueDate!;
        const dtEnd = issue.dueDate!;
        const summary = escapeICS(`[${issue.key}] ${issue.title}`);
        const description = escapeICS(
            `Project: ${issue.project.name}\nStatus: ${issue.status}\nPriority: ${issue.priority}\n\n${issue.description ?? ""}`
        );
        const isPast = dtEnd < now && issue.status !== "DONE";

        return [
            "BEGIN:VEVENT",
            `UID:${uid}`,
            `DTSTAMP:${formatICSDate(now)}`,
            `DTSTART;VALUE=DATE:${formatICSDate(dtStart).slice(0, 8)}`,
            `DTEND;VALUE=DATE:${formatICSDate(dtEnd).slice(0, 8)}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            `STATUS:${issue.status === "DONE" ? "COMPLETED" : "NEEDS-ACTION"}`,
            `PRIORITY:${issue.priority === "URGENT" ? 1 : issue.priority === "HIGH" ? 3 : 5}`,
            ...(isPast ? ["X-MICROSOFT-CDO-IMPORTANCE:2", "X-APPLE-MARK:1"] : []),
            "END:VEVENT",
        ].join("\r\n");
    });

    const icsBody = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//FRIDAY PM//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${calName}`,
        "X-WR-TIMEZONE:UTC",
        ...events,
        "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(icsBody, {
        status: 200,
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `attachment; filename="friday-pm-${workspaceId}.ics"`,
            "Cache-Control": "no-cache, max-age=0",
        },
    });
}

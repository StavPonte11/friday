/**
 * Analytics event tracking helper.
 *
 * Writes behavioral events to the AnalyticsEvent DB table and
 * optionally forwards them to Langfuse as spans for correlation
 * with AI traces.
 *
 * Usage:
 *   await trackEvent("pm.issue.create", { userId, projectId, issueId })
 */

import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Supported event names (exhaustive union for type safety)
// ---------------------------------------------------------------------------
export const AnalyticsEventNameSchema = z.enum([
  "pm.issue.create",
  "pm.issue.edit",
  "pm.issue.view",
  "pm.issue.delete",
  "pm.board.move",
  "pm.comment.add",
  "pm.comment.react",
  "pm.feedback.submit",
  "pm.gantt.view",
  "pm.calendar.view",
  "pm.presence.update",
  "pm.onboarding.step",
  "pm.onboarding.skip",
  "pm.sprint.create",
  "pm.sprint.start",
  "pm.sprint.complete",
  "pm_agent.run",
  "docs.view",
  "docs.search",
  "docs.click",
]);

export type AnalyticsEventName = z.infer<typeof AnalyticsEventNameSchema>;

// ---------------------------------------------------------------------------
// Event properties schema
// ---------------------------------------------------------------------------
export const AnalyticsEventPropertiesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export type AnalyticsEventProperties = z.infer<
  typeof AnalyticsEventPropertiesSchema
>;

// ---------------------------------------------------------------------------
// Core trackEvent function
// ---------------------------------------------------------------------------
export async function trackEvent(
  event: AnalyticsEventName,
  properties: AnalyticsEventProperties & { userId?: string }
): Promise<void> {
  const { userId, ...rest } = properties;

  try {
    await prisma.analyticsEvent.create({
      data: {
        userId: userId ?? null,
        event,
        properties: rest,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    // Never throw — analytics must not break the main flow
    console.error("[analytics] Failed to track event", event, err);
  }
}

// ---------------------------------------------------------------------------
// Aggregation helpers used by the admin dashboard
// ---------------------------------------------------------------------------

/**
 * Returns DAU (distinct users) per day for the last N days.
 */
export async function getDailyActiveUsers(
  days: number = 30
): Promise<{ date: string; count: number }[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: cutoff }, userId: { not: null } },
    select: { userId: true, createdAt: true },
  });

  const byDay: Record<string, Set<string>> = {};
  for (const e of events) {
    const day = e.createdAt.toISOString().split("T")[0]!;
    if (!byDay[day]) byDay[day] = new Set();
    byDay[day].add(e.userId!);
  }

  return Object.entries(byDay)
    .map(([date, users]) => ({ date, count: users.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Returns count of events grouped by event name for the last N days.
 */
export async function getFeatureUsage(
  days: number = 30
): Promise<{ event: string; count: number }[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Use raw groupBy query via findMany + reduce for Prisma compatibility
  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: cutoff } },
    select: { event: true },
  });

  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.event] = (counts[e.event] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Returns issues created per day for the last N days.
 */
export async function getIssuesCreatedPerDay(
  days: number = 30
): Promise<{ date: string; count: number }[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const events = await prisma.analyticsEvent.findMany({
    where: { event: "pm.issue.create", createdAt: { gte: cutoff } },
    select: { createdAt: true },
  });

  const byDay: Record<string, number> = {};
  for (const e of events) {
    const day = e.createdAt.toISOString().split("T")[0]!;
    byDay[day] = (byDay[day] ?? 0) + 1;
  }

  return Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generates UX insights based on thresholds over the last 30 days.
 */
export async function generateInsights(): Promise<
  { severity: "info" | "warning"; message: string }[]
> {
  const [usage, dau] = await Promise.all([
    getFeatureUsage(30),
    getDailyActiveUsers(30),
  ]);

  const insights: { severity: "info" | "warning"; message: string }[] = [];
  const totalEvents = usage.reduce((sum, u) => sum + u.count, 0);

  if (totalEvents === 0) return insights;

  // Gantt low usage
  const ganttUsage = usage.find((u) => u.event === "pm.gantt.view");
  if (ganttUsage) {
    const pct = Math.round((ganttUsage.count / totalEvents) * 100);
    if (pct < 10) {
      insights.push({
        severity: "warning",
        message: `Low usage detected: Gantt view used by only ${pct}% of sessions in the last 30 days.`,
      });
    }
  } else {
    insights.push({
      severity: "info",
      message: "Gantt view has not been used in the last 30 days.",
    });
  }

  // Calendar low usage
  const calendarUsage = usage.find((u) => u.event === "pm.calendar.view");
  if (!calendarUsage || calendarUsage.count === 0) {
    insights.push({
      severity: "info",
      message: "Calendar view has not been used in the last 30 days.",
    });
  }

  // Low activity days
  if (dau.length > 7) {
    const avgDau =
      dau.slice(-7).reduce((sum, d) => sum + d.count, 0) /
      Math.min(dau.length, 7);
    if (avgDau < 3) {
      insights.push({
        severity: "warning",
        message: `Low daily active users: average ${avgDau.toFixed(1)} DAU over last 7 days.`,
      });
    }
  }

  return insights;
}

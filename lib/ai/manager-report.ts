/**
 * Manager Report Generator
 * Generates a weekly engineering manager report combining:
 *   - Sprint velocity (planned vs completed story points)
 *   - Top blockers (BLOCKED + high-priority TODO > 3 days old)
 *   - Developer workload (WIP issues per assignee)
 *   - AI-generated executive summary via LLM
 *
 * Returns a ManagerReport object with both structured JSON and a rendered Markdown string.
 */

import { prisma } from "../prisma";
import { getLLMProvider } from "@/lib/ai/provider";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SprintVelocity {
    sprintId: string;
    sprintName: string;
    plannedPoints: number;
    completedPoints: number;
    completionRate: number; // 0–1
}

export interface BlockerItem {
    issueKey: string;
    title: string;
    priority: string;
    daysOld: number;
    assigneeName: string | null;
}

export interface DeveloperWorkload {
    userId: string;
    name: string;
    wipIssues: number;
    totalPoints: number;
}

export interface ManagerReport {
    projectId: string;
    projectKey: string;
    generatedAt: string;
    weekStart: string;
    velocity: SprintVelocity[];
    blockers: BlockerItem[];
    workload: DeveloperWorkload[];
    executiveSummary: string;
    markdown: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
    return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateManagerReport(projectId: string): Promise<ManagerReport> {
    const project = await prisma.pmProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── 1. Sprint velocity ───────────────────────────────────────────────────
    const recentSprints = await prisma.pmSprint.findMany({
        where: { projectId, status: { in: ["COMPLETED", "ACTIVE"] } },
        include: { issues: { select: { storyPoints: true, status: true } } },
        orderBy: { endDate: "desc" },
        take: 4,
    });

    const velocity: SprintVelocity[] = recentSprints.map((s: { issues: any[]; id: any; name: any; }) => {
        const planned = s.issues.reduce((acc: any, i: any) => acc + (i.storyPoints ?? 0), 0);
        const completed = s.issues
            .filter((i: { status: string; }) => i.status === "DONE")
            .reduce((acc: any, i: any) => acc + (i.storyPoints ?? 0), 0);
        return {
            sprintId: s.id,
            sprintName: s.name,
            plannedPoints: planned,
            completedPoints: completed,
            completionRate: planned > 0 ? completed / planned : 0,
        };
    });

    // ── 2. Blockers ───────────────────────────────────────────────────────────
    const blockerIssues = await prisma.pmIssue.findMany({
        where: {
            projectId,
            OR: [
                { status: "BLOCKED" },
                { status: "TODO", priority: { in: ["URGENT", "HIGH"] }, createdAt: { lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } }
            ]
        },
        include: { assignee: { select: { name: true } } },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: 10,
    });

    const blockers: BlockerItem[] = blockerIssues.map((i: any) => ({
        issueKey: i.key,
        title: i.title,
        priority: i.priority,
        daysOld: daysBetween(i.createdAt, now),
        assigneeName: i.assignee?.name ?? null,
    }));

    // ── 3. Developer workload ─────────────────────────────────────────────────
    const wipIssues = await prisma.pmIssue.findMany({
        where: {
            projectId,
            status: { in: ["IN_PROGRESS", "IN_REVIEW"] },
            assigneeId: { not: null },
        },
        select: {
            assigneeId: true,
            storyPoints: true,
            assignee: { select: { id: true, name: true } },
            status: true,
        },
    });

    const workloadMap = new Map<string, DeveloperWorkload>();
    for (const issue of wipIssues) {
        if (!issue.assigneeId || !issue.assignee) continue;
        const existing = workloadMap.get(issue.assigneeId) ?? {
            userId: issue.assigneeId,
            name: issue.assignee.name ?? "Unknown",
            wipIssues: 0,
            totalPoints: 0,
        };
        existing.wipIssues += 1;
        existing.totalPoints += issue.storyPoints ?? 0;
        workloadMap.set(issue.assigneeId, existing);
    }
    const workload = [...workloadMap.values()].sort((a, b) => b.wipIssues - a.wipIssues);

    // ── 4. AI executive summary ───────────────────────────────────────────────
    const avgVelocity = velocity.length > 0
        ? Math.round(velocity.reduce((a, v) => a + v.completionRate, 0) / velocity.length * 100)
        : 0;

    const execPrompt =
        `You are an engineering manager writing a concise weekly update.\n\n` +
        `Project: ${project.name} (${project.key})\n` +
        `Avg sprint completion: ${avgVelocity}%\n` +
        `Active blockers: ${blockers.length}\n` +
        `Developers actively working: ${workload.length}\n` +
        `Highest workload: ${workload[0]?.name ?? "N/A"} (${workload[0]?.wipIssues ?? 0} issues)\n\n` +
        `Write a 3-sentence executive summary highlighting team health, risks, and one recommendation.`;

    let executiveSummary = `Team is progressing at ${avgVelocity}% sprint completion rate with ${blockers.length} active blocker(s). ${workload.length} developers are actively working on tasks.`;
    try {
        const llm = getLLMProvider();
        const resp = await llm.invoke(execPrompt);
        executiveSummary = typeof resp.content === "string" ? resp.content : executiveSummary;
    } catch {
        // keep default
    }

    // ── 5. Render Markdown ────────────────────────────────────────────────────
    const weekStr = weekAgo.toISOString().split("T")[0];
    const nowStr = now.toISOString().split("T")[0];

    const velocityTable = velocity.length > 0
        ? `| Sprint | Planned | Completed | Rate |\n|--------|---------|-----------|------|\n` +
          velocity.map(v => `| ${v.sprintName} | ${v.plannedPoints} pts | ${v.completedPoints} pts | ${Math.round(v.completionRate * 100)}% |`).join("\n")
        : "_No sprint data available._";

    const blockerList = blockers.length > 0
        ? blockers.map(b => `- **${b.issueKey}** — ${b.title} _(${b.priority}, ${b.daysOld}d old${b.assigneeName ? `, ${b.assigneeName}` : ""})_`).join("\n")
        : "_No blockers. 🎉_";

    const workloadList = workload.length > 0
        ? workload.map(w => `- **${w.name}**: ${w.wipIssues} issue(s), ${w.totalPoints} pts in progress`).join("\n")
        : "_No developers with active WIP._";

    const markdown = `# 📊 Weekly Engineering Report — ${project.name}
**Period:** ${weekStr} → ${nowStr}

## Executive Summary
${executiveSummary}

---

## 🏃 Sprint Velocity
${velocityTable}

---

## 🚧 Active Blockers
${blockerList}

---

## 👥 Developer Workload
${workloadList}

---
_Generated by FRIDAY PM Manager Report on ${now.toISOString()}_
`;

    return {
        projectId,
        projectKey: project.key,
        generatedAt: now.toISOString(),
        weekStart: weekStr,
        velocity,
        blockers,
        workload,
        executiveSummary,
        markdown,
    };
}

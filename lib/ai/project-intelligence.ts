/**
 * lib/ai/project-intelligence.ts
 *
 * Project Intelligence Service — The Brain of the Execution OS
 *
 * Unifies, enhances, and extends FRIDAY's existing AI assets:
 *   - manager-report.ts (workload, velocity, blockers)
 *   - backlog-grooming.ts (quality analysis)
 *   - pm-sprint-planning.ts (sprint planning)
 *   - pm-issue-insights.ts (issue complexity)
 *
 * Adds net-new capabilities:
 *   - Risk Detection
 *   - Delivery Forecasting
 *   - High-level Insight Engine
 *   - Deterministic fallback logic (works WITHOUT LLM)
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getLLMProvider } from "@/lib/ai/provider";

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas (strict, no any)
// ─────────────────────────────────────────────────────────────────────────────

export const RiskSchema = z.object({
    id: z.string(),
    type: z.enum(["overload", "delay", "dependency_missing", "unclear_scope"]),
    severity: z.enum(["low", "medium", "high"]),
    title: z.string(),
    description: z.string(),
    affectedIssues: z.array(z.string()),
    rootCause: z.string(),
    recommendation: z.string(),
    confidence: z.number().min(0).max(1),
});
export type Risk = z.infer<typeof RiskSchema>;

export const RiskReportSchema = z.object({
    projectId: z.string(),
    generatedAt: z.string(),
    risks: z.array(RiskSchema),
    overallHealthScore: z.number().min(0).max(100),
    summary: z.string(),
});
export type RiskReport = z.infer<typeof RiskReportSchema>;

export const DeliveryForecastSchema = z.object({
    feature: z.string(),
    predictedStart: z.string(), // ISO string (JSON-safe)
    predictedEnd: z.string(),
    confidence: z.number().min(0).max(1),
    riskFactors: z.array(z.string()),
    explanation: z.object({
        reasoning: z.string(),
        factors: z.array(z.string()),
    }),
});
export type DeliveryForecast = z.infer<typeof DeliveryForecastSchema>;

export const InsightSchema = z.object({
    type: z.enum(["performance", "risk", "optimization"]),
    message: z.string(),
    impact: z.string(),
    recommendation: z.string(),
    confidence: z.number().min(0).max(1),
});
export type Insight = z.infer<typeof InsightSchema>;

export const QualityReportSchema = z.object({
    issueId: z.string(),
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
    suggestions: z.array(z.string()),
    confidence: z.number().min(0).max(1),
});
export type QualityReport = z.infer<typeof QualityReportSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
    return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function generateRiskId(type: string, issueId: string): string {
    return `risk_${type}_${issueId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1: Risk Detection
// ─────────────────────────────────────────────────────────────────────────────

export async function detectRisks(projectId: string): Promise<RiskReport> {
    const now = new Date();

    const [project, issues, activeSprint] = await Promise.all([
        prisma.pmProject.findUniqueOrThrow({ where: { id: projectId } }),
        prisma.pmIssue.findMany({
            where: { projectId, status: { not: "DONE" }, deletedAt: null },
            include: {
                assignee: { select: { id: true, name: true } },
                sourceLinks: { where: { type: "BLOCKS" }, include: { targetIssue: { select: { id: true, status: true } } } },
            },
        }),
        prisma.pmSprint.findFirst({
            where: { projectId, status: "ACTIVE" },
            include: { issues: true },
        }),
    ]);
    void activeSprint; // reserved for future capacity checks

    const risks: Risk[] = [];

    // ── 1.1 Delay Risks: issues that are overdue or aging ──────────────────────
    for (const issue of issues) {
        const dueDate = issue.dueDate;
        if (dueDate && new Date(dueDate) < now && issue.status !== "DONE") {
            risks.push(RiskSchema.parse({
                id: generateRiskId("delay", issue.id),
                type: "delay",
                severity: daysBetween(new Date(dueDate), now) > 7 ? "high" : "medium",
                title: `Issue overdue: ${issue.key}`,
                description: `"${issue.title}" was due ${daysBetween(new Date(dueDate), now)} day(s) ago and is still ${issue.status}.`,
                affectedIssues: [issue.id],
                rootCause: "Issue passed its due date without completion.",
                recommendation: `Update the due date or escalate priority for ${issue.key}. Assign or reassign if unblocked.`,
                confidence: 0.95,
            }));
        }

        // Aging issues (> 14 days in TODO / IN_PROGRESS without progress)
        const ageDays = daysBetween(new Date(issue.createdAt), now);
        if (ageDays > 14 && ["TODO", "IN_PROGRESS"].includes(issue.status)) {
            const alreadyHasDelayRisk = risks.some(r => r.affectedIssues.includes(issue.id) && r.type === "delay");
            if (!alreadyHasDelayRisk) {
                risks.push(RiskSchema.parse({
                    id: generateRiskId("aging", issue.id),
                    type: "delay",
                    severity: ageDays > 21 ? "high" : "low",
                    title: `Stale issue: ${issue.key} (${ageDays}d)`,
                    description: `"${issue.title}" has been in ${issue.status} for ${ageDays} days without resolution.`,
                    affectedIssues: [issue.id],
                    rootCause: "Issue stalled without updates or progress log.",
                    recommendation: `Review ${issue.key} status. If blocked, mark it accordingly and surface to the team.`,
                    confidence: 0.8,
                }));
            }
        }
    }

    // ── 1.2 Dependency Risks: this issue is blocking unfinished work ──────────
    for (const issue of issues) {
        const blockingLinks = issue.sourceLinks as Array<{ targetIssue: { id: string; status: string } }>;
        const activeBlocks = blockingLinks.filter(l => l.targetIssue.status !== "DONE");
        if (activeBlocks.length > 0) {
            risks.push(RiskSchema.parse({
                id: generateRiskId("dep", issue.id),
                type: "dependency_missing",
                severity: "high",
                title: `${issue.key} is blocking ${activeBlocks.length} incomplete issue(s)`,
                description: `Issue "${issue.title}" has not been resolved, blocking ${activeBlocks.length} downstream issue(s).`,
                affectedIssues: [issue.id, ...activeBlocks.map(l => l.targetIssue.id)],
                rootCause: "Upstream dependency not completed before downstream work started.",
                recommendation: "Prioritize resolving this issue, or re-plan to decouple the dependency.",
                confidence: 1.0,
            }));
        }
    }

    // ── 1.3 Overload Risks: assignees with > 4 active items ───────────────────
    const assigneeCounts = new Map<string, { name: string; issueIds: string[] }>();
    for (const issue of issues) {
        if (issue.assigneeId && issue.assignee && ["IN_PROGRESS", "IN_REVIEW"].includes(issue.status)) {
            const entry = assigneeCounts.get(issue.assigneeId) ?? { name: issue.assignee.name ?? "Unknown", issueIds: [] };
            entry.issueIds.push(issue.id);
            assigneeCounts.set(issue.assigneeId, entry);
        }
    }
    for (const [assigneeId, data] of assigneeCounts.entries()) {
        if (data.issueIds.length > 4) {
            risks.push(RiskSchema.parse({
                id: generateRiskId("overload", assigneeId),
                type: "overload",
                severity: data.issueIds.length > 6 ? "high" : "medium",
                title: `${data.name} is overloaded (${data.issueIds.length} active issues)`,
                description: `${data.name} currently has ${data.issueIds.length} issues in active states. This exceeds the recommended WIP limit of 4.`,
                affectedIssues: data.issueIds,
                rootCause: "Too many issues assigned to a single developer without redistribution.",
                recommendation: `Re-assign some of ${data.name}'s lower-priority issues or reduce the active sprint scope.`,
                confidence: 0.9,
            }));
        }
    }

    // ── 1.4 Unclear Scope Risks: issues with no description ───────────────────
    for (const issue of issues) {
        if (!issue.description || issue.description.trim().length < 20) {
            risks.push(RiskSchema.parse({
                id: generateRiskId("scope", issue.id),
                type: "unclear_scope",
                severity: "low",
                title: `${issue.key} lacks description`,
                description: `"${issue.title}" has no clear description or acceptance criteria, increasing misalignment risk.`,
                affectedIssues: [issue.id],
                rootCause: "Issue created without sufficient detail for implementation.",
                recommendation: `Open ${issue.key} and add a description with at minimum: what, why, and done criteria.`,
                confidence: 0.85,
            }));
        }
    }

    // Health score: penalise for each high/medium risk
    const highCount = risks.filter(r => r.severity === "high").length;
    const medCount = risks.filter(r => r.severity === "medium").length;
    const overallHealthScore = Math.max(0, 100 - (highCount * 15) - (medCount * 5));

    const summary = risks.length === 0
        ? `Project ${project.key} is healthy. No significant risks detected.`
        : `Detected ${risks.length} risk(s) across ${project.key}: ${highCount} high, ${medCount} medium. Overall health: ${overallHealthScore}/100.`;

    return RiskReportSchema.parse({
        projectId,
        generatedAt: now.toISOString(),
        risks,
        overallHealthScore,
        summary,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2: Delivery Forecast
// ─────────────────────────────────────────────────────────────────────────────

export async function forecastDelivery(sprintId: string): Promise<DeliveryForecast[]> {
    const sprint = await prisma.pmSprint.findUniqueOrThrow({
        where: { id: sprintId },
        include: {
            issues: {
                include: {
                    sourceLinks: { where: { type: "BLOCKS" }, include: { targetIssue: { select: { status: true } } } },
                },
            },
        },
    });

    const now = new Date();
    const sprintEnd = sprint.endDate ? new Date(sprint.endDate) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.max(1, daysBetween(now, sprintEnd));

    const totalIssues = sprint.issues.length;
    const doneIssues = sprint.issues.filter(i => i.status === "DONE").length;
    const completionRate = totalIssues > 0 ? doneIssues / totalIssues : 0;
    const remainingIssues = totalIssues - doneIssues;

    // Velocity: project from completion rate
    const avgIssueDays = doneIssues > 0 ? (daysBetween(new Date(sprint.startDate!), now) / doneIssues) : 3;
    const predictedDaysToComplete = Math.ceil(remainingIssues * avgIssueDays);
    const predictedEnd = new Date(now.getTime() + predictedDaysToComplete * 24 * 60 * 60 * 1000);

    type IssueWithLinks = typeof sprint.issues[0] & { sourceLinks: Array<{ targetIssue: { status: string } }> };
    const blockedCount = (sprint.issues as IssueWithLinks[]).filter(i =>
        i.sourceLinks.some(l => l.targetIssue.status !== "DONE")
    ).length;

    const riskFactors: string[] = [];
    if (predictedDaysToComplete > daysLeft) riskFactors.push(`May miss sprint by ~${predictedDaysToComplete - daysLeft} day(s)`);
    if (blockedCount > 0) riskFactors.push(`${blockedCount} issue(s) blocked by unresolved dependencies`);
    if (completionRate < 0.3 && daysLeft < 5) riskFactors.push("Low completion rate with little sprint time remaining");

    const confidence = Math.max(0.4, Math.min(0.95, completionRate + (doneIssues > 2 ? 0.2 : 0)));

    return [DeliveryForecastSchema.parse({
        feature: sprint.name,
        predictedStart: now.toISOString(),
        predictedEnd: predictedEnd.toISOString(),
        confidence,
        riskFactors,
        explanation: {
            reasoning: `Based on ${doneIssues} completed out of ${totalIssues} issues. At the current pace of ~${avgIssueDays.toFixed(1)} days/issue, remaining ${remainingIssues} issues will take ~${predictedDaysToComplete} more days.`,
            factors: [
                `Sprint completion: ${Math.round(completionRate * 100)}%`,
                `Days remaining in sprint: ${daysLeft}`,
                `Predicted days to finish: ${predictedDaysToComplete}`,
                `Blocked issues: ${blockedCount}`,
            ],
        },
    })];
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 4: Requirement Quality Analysis
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeRequirements(issueId: string): Promise<QualityReport> {
    const issue = await prisma.pmIssue.findUniqueOrThrow({
        where: { id: issueId },
        select: { id: true, title: true, description: true },
    });

    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Deterministic checks
    if (!issue.description || issue.description.trim().length === 0) {
        issues.push("No description provided.");
        suggestions.push("Add a description explaining the purpose and expected behavior.");
        score -= 40;
    } else if (issue.description.trim().length < 30) {
        issues.push("Description is too short (< 30 chars).");
        suggestions.push("Expand the description with context, motivation, and examples.");
        score -= 20;
    }

    const hasAcceptanceCriteria = /accept|criteria|done when|definition of done|ac:/i.test(issue.description ?? "");
    if (!hasAcceptanceCriteria) {
        issues.push("Missing acceptance criteria.");
        suggestions.push('Add "Acceptance Criteria" section: "Done when..." or "AC: the user can..."');
        score -= 25;
    }

    const hasVagueWords = /\b(maybe|somehow|something|stuff|things|fix|update|improve)\b/i.test(issue.title + " " + (issue.description ?? ""));
    if (hasVagueWords) {
        issues.push("Vague language detected (e.g., 'fix', 'improve', 'stuff').");
        suggestions.push("Replace vague terms with specific, measurable outcomes.");
        score -= 15;
    }

    score = Math.max(0, score);

    // LLM enhancement (optional, best-effort)
    if (score < 80) {
        try {
            const llm = getLLMProvider();
            const improvementSchema = z.object({
                additionalSuggestions: z.array(z.string()).describe("2-3 additional concrete suggestions to improve this issue"),
            });
            const structured = llm.withStructuredOutput(improvementSchema, { name: "ImprovementSuggestions" });
            const result = await structured.invoke([
                ["system", "You are a senior product manager reviewing engineering issues for clarity."],
                ["human", `Issue Title: ${issue.title}\nDescription: ${issue.description || "(empty)"}\n\nProvide 2-3 specific suggestions to improve the quality of this issue definition.`],
            ]) as z.infer<typeof improvementSchema>;
            suggestions.push(...result.additionalSuggestions);
        } catch {
            // LLM unavailable — deterministic results still returned
        }
    }

    return QualityReportSchema.parse({
        issueId,
        score,
        issues,
        suggestions,
        confidence: 0.85,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 5: Insight Engine
// ─────────────────────────────────────────────────────────────────────────────

export async function generateInsights(projectId: string): Promise<Insight[]> {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [recentSprints, allActiveIssues] = await Promise.all([
        prisma.pmSprint.findMany({
            where: { projectId, status: { in: ["ACTIVE", "COMPLETED"] }, startDate: { gte: last30Days } },
            include: { issues: { select: { status: true, storyPoints: true, assigneeId: true } } },
            orderBy: { startDate: "desc" },
            take: 4,
        }),
        prisma.pmIssue.findMany({
            where: { projectId, status: { not: "DONE" }, assigneeId: { not: null } },
            select: { assigneeId: true, storyPoints: true, status: true, createdAt: true, assignee: { select: { name: true } } },
        }),
    ]);

    const insights: Insight[] = [];

    // ── Insight: Sprint velocity trend ────────────────────────────────────────
    if (recentSprints.length >= 2) {
        const rates = recentSprints.map(s => {
            const planned = s.issues.reduce((acc, i) => acc + (i.storyPoints ?? 0), 0);
            const done = s.issues.filter(i => i.status === "DONE").reduce((acc, i) => acc + (i.storyPoints ?? 0), 0);
            return planned > 0 ? done / planned : 0;
        });
        const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
        const trend = rates[0] > rates[rates.length - 1] ? "declining" : "improving";

        insights.push(InsightSchema.parse({
            type: "performance",
            message: `Team velocity is ${trend}. Average sprint completion: ${Math.round(avgRate * 100)}% over last ${recentSprints.length} sprints.`,
            impact: trend === "declining" ? "Risk of missing upcoming deadlines if trend continues." : "Team is building momentum.",
            recommendation: trend === "declining"
                ? "Review sprint scope and reduce WIP. Identify recurring blockers."
                : "Maintain current pace; consider slightly increasing sprint capacity.",
            confidence: 0.85,
        }));
    }

    // ── Insight: Overloaded team members ─────────────────────────────────────
    const assigneeWip = new Map<string, { name: string; count: number; points: number }>();
    for (const issue of allActiveIssues) {
        if (!issue.assigneeId || !issue.assignee) continue;
        const entry = assigneeWip.get(issue.assigneeId) ?? { name: issue.assignee.name ?? "Unknown", count: 0, points: 0 };
        entry.count += 1;
        entry.points += issue.storyPoints ?? 0;
        assigneeWip.set(issue.assigneeId, entry);
    }

    const overloaded = [...assigneeWip.values()].filter(a => a.count > 4).sort((a, b) => b.count - a.count);
    if (overloaded.length > 0) {
        const topOverloaded = overloaded[0];
        insights.push(InsightSchema.parse({
            type: "risk",
            message: `${topOverloaded.name} is carrying ${topOverloaded.count} active issues (${topOverloaded.points} pts). ${overloaded.length > 1 ? `${overloaded.length - 1} other(s) also overloaded.` : ""}`,
            impact: "High WIP per developer slows throughput and increases defect risk.",
            recommendation: `Re-distribute work from ${topOverloaded.name}. Focus on finishing before starting.`,
            confidence: 0.9,
        }));
    }

    // ── Insight: Stale issues ────────────────────────────────────────────────
    const staleIssues = allActiveIssues.filter(i => daysBetween(new Date(i.createdAt), now) > 21);
    if (staleIssues.length > 0) {
        insights.push(InsightSchema.parse({
            type: "optimization",
            message: `${staleIssues.length} issue(s) have been open for >21 days without resolution.`,
            impact: "Stale issues clog the backlog, reduce planning accuracy, and signal hidden blockers.",
            recommendation: "Run a focused grooming session. Close or re-scope stale issues this sprint.",
            confidence: 0.8,
        }));
    }

    return insights;
}

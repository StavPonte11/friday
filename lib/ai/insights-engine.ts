import { getLLMProvider } from "./provider";
import { getCycleTime, getTopBottlenecks, getTeamLoad, getSprintVelocity } from "@/lib/analytics/work-metrics";

export interface Insight {
    severity: "info" | "warning" | "critical";
    category: "velocity" | "bottleneck" | "load" | "cycle_time" | "general";
    message: string;
    recommendation?: string;
}

/**
 * Generates AI-powered insights from work metrics using an LLM.
 */
export async function generateWorkInsights(projectId: string): Promise<Insight[]> {
    const [cycleTime, bottlenecks, teamLoad, velocity] = await Promise.all([
        getCycleTime(projectId),
        getTopBottlenecks(projectId, 3),
        getTeamLoad(projectId),
        getSprintVelocity(projectId, 4)
    ]);

    const metricsContext = JSON.stringify({
        cycleTimeAvgDays: cycleTime ? Math.round(cycleTime * 10) / 10 : null,
        topBottlenecks: bottlenecks.map(b => ({
            key: b.issue.key,
            title: b.issue.title,
            status: b.issue.status,
            blockedCount: b.blockedCount
        })),
        teamLoad: teamLoad.slice(0, 5).map(l => ({
            user: l.user?.name,
            openIssues: l.count,
            totalPoints: l.points
        })),
        sprintVelocity: velocity.map(v => ({
            sprint: v.sprintName,
            completedPoints: v.completedPoints
        }))
    }, null, 2);

    const llm = getLLMProvider();

    const response = await llm.invoke([
        {
            role: "system",
            content: `You are a senior engineering manager analysing project health metrics for F.R.I.D.A.Y.
Return a JSON array of insights. Each insight has:
- severity: "info" | "warning" | "critical"
- category: "velocity" | "bottleneck" | "load" | "cycle_time" | "general"
- message: a concise, specific, human-friendly observation (1-2 sentences)
- recommendation: an actionable suggestion (optional, 1 sentence)

Focus on what's actionable. Be specific about issue keys or team members when available. Return ONLY valid JSON array.`
        },
        {
            role: "user",
            content: `Here are the current work metrics for this project:\n\n${metricsContext}\n\nGenerate 3-5 prioritised insights.`
        }
    ]);

    const rawContent = typeof response.content === "string" ? response.content : "";

    try {
        // Extract JSON from potential markdown code blocks
        const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]+?)```/) || [null, rawContent];
        const parsed = JSON.parse(jsonMatch[1] ?? rawContent) as Insight[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // Fallback to rule-based insights if LLM fails
        const insights: Insight[] = [];

        if (cycleTime && cycleTime > 7) {
            insights.push({
                severity: "warning",
                category: "cycle_time",
                message: `Average cycle time is ${cycleTime.toFixed(1)} days — higher than the recommended 5 days.`,
                recommendation: "Review issues stuck in IN_PROGRESS and identify blockers."
            });
        }

        if (bottlenecks.length > 0) {
            const top = bottlenecks[0];
            insights.push({
                severity: "critical",
                category: "bottleneck",
                message: `${top.issue.key} is blocking ${top.blockedCount} other issues and its status is ${top.issue.status}.`,
                recommendation: "Prioritise resolving this issue to unblock downstream work."
            });
        }

        return insights;
    }
}

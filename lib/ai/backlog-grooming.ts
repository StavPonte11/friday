/**
 * Backlog Grooming Agent
 * Scans a project backlog and surfaces:
 *   - Potential duplicate issues (same intent/scope)
 *   - Oversized issues (storyPoints > 8 that should be split)
 *   - Issues missing acceptance criteria / description
 *
 * Uses the same Ollama-based LLM as pm-agent.ts.
 * Returns structured GroomingReport that can be rendered in the UI or sent as a manager report.
 */

import { prisma } from "../prisma";
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL || "http://localhost:11434/v1",
    },
    model: process.env.OPENAI_MODEL_NAME || "llama3",
    apiKey: process.env.OPENAI_API_KEY || "not-needed-for-local",
    temperature: 0.2,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DuplicatePair {
    issueKeyA: string;
    titleA: string;
    issueKeyB: string;
    titleB: string;
    reason: string;
}

export interface OversizedIssue {
    issueKey: string;
    title: string;
    storyPoints: number;
    splitSuggestion: string;
}

export interface MissingCriteriaIssue {
    issueKey: string;
    title: string;
    issue: "no_description" | "too_short" | "no_acceptance_criteria";
}

export interface GroomingReport {
    projectId: string;
    projectKey: string;
    generatedAt: string;
    backlogSize: number;
    duplicates: DuplicatePair[];
    oversized: OversizedIssue[];
    missingCriteria: MissingCriteriaIssue[];
    summary: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasMissingCriteria(issue: { title: string; description: string | null }): MissingCriteriaIssue["issue"] | null {
    if (!issue.description || issue.description.trim().length === 0) return "no_description";
    if (issue.description.trim().length < 30) return "too_short";
    const hasAC = /accept|criteria|done when|definition of done|ac:/i.test(issue.description);
    if (!hasAC) return "no_acceptance_criteria";
    return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function groomBacklog(projectId: string): Promise<GroomingReport> {
    const project = await prisma.pmProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const issues = await prisma.pmIssue.findMany({
        where: { projectId, status: "BACKLOG" },
        select: { key: true, title: true, description: true, storyPoints: true },
        orderBy: { createdAt: "asc" },
        take: 50, // keep prompt manageable
    });

    const missingCriteria: MissingCriteriaIssue[] = issues
        .map((i: any) => {
            const issue = hasMissingCriteria(i);
            if (!issue) return null;
            return { issueKey: i.key, title: i.title, issue } as MissingCriteriaIssue;
        })
        .filter((x: any): x is MissingCriteriaIssue => x !== null);

    const oversized: OversizedIssue[] = [];
    const OVERSIZED_THRESHOLD = 8;

    for (const issue of issues.filter((i: { storyPoints: any; }) => (i.storyPoints ?? 0) > OVERSIZED_THRESHOLD)) {
        let splitSuggestion = "Consider splitting into 2-3 smaller tasks.";
        try {
            const resp = await llm.invoke(
                `Issue: "${issue.title}" (${issue.storyPoints} story points)\n` +
                `Briefly suggest 2-3 subtask titles to split this into. Reply as a comma-separated list only.`
            );
            splitSuggestion = resp.content as string;
        } catch {
            // keep default
        }
        oversized.push({
            issueKey: issue.key,
            title: issue.title,
            storyPoints: issue.storyPoints ?? 0,
            splitSuggestion,
        });
    }

    // Duplicate detection via LLM on condensed list
    let duplicates: DuplicatePair[] = [];
    if (issues.length >= 2) {
        const issueList = issues.map((i: { key: any; title: any; }) => `- ${i.key}: ${i.title}`).join("\n");
        const dupPrompt =
            `You are a senior PM reviewing this backlog. Identify ONLY clearly duplicate issues (same goal/scope).\n\n` +
            `Issues:\n${issueList}\n\n` +
            `Return as JSON array: [{"keyA":"...","keyB":"...","reason":"..."}]. Empty array if none.`;
        try {
            const resp = await llm.invoke(dupPrompt);
            const text = (resp.content as string).trim();
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as { keyA: string; keyB: string; reason: string }[];
                for (const pair of parsed) {
                    const a = issues.find((i: { key: string; }) => i.key === pair.keyA);
                    const b = issues.find((i: { key: string; }) => i.key === pair.keyB);
                    if (a && b) {
                        duplicates.push({
                            issueKeyA: a.key,
                            titleA: a.title,
                            issueKeyB: b.key,
                            titleB: b.title,
                            reason: pair.reason,
                        });
                    }
                }
            }
        } catch {
            duplicates = [];
        }
    }

    // Executive summary
    let summary = `Backlog grooming complete for ${project.key}. Found ${duplicates.length} duplicate(s), ${oversized.length} oversized issue(s), and ${missingCriteria.length} issue(s) missing acceptance criteria.`;
    try {
        const summaryPrompt =
            `Sprint grooming summary for project ${project.name}:\n` +
            `- Backlog size: ${issues.length}\n` +
            `- Duplicates found: ${duplicates.length}\n` +
            `- Oversized issues: ${oversized.length}\n` +
            `- Issues missing criteria: ${missingCriteria.length}\n\n` +
            `Write a 2-sentence actionable summary for the team lead.`;
        const summaryResp = await llm.invoke(summaryPrompt);
        summary = summaryResp.content as string;
    } catch {
        // keep default
    }

    return {
        projectId,
        projectKey: project.key,
        generatedAt: new Date().toISOString(),
        backlogSize: issues.length,
        duplicates,
        oversized,
        missingCriteria,
        summary,
    };
}

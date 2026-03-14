import prisma from "../prisma";
/**
 * Friday PM AI Inner Agent
 * LangGraph-based agent connected to local Ollama + LangFuse tracing.
 * 
 * Tools:
 *  - generateIssue: creates a structured PmIssue from a natural language request
 *  - detectDuplicates: finds similar issues using text similarity
 *  - analyzeSprintHealth: evaluates sprint risk and suggests re-prioritization
 *  - autoPrioritizeBacklog: ranks backlog items by value/effort ratio
 */

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {  PmIssueStatus, PmIssuePriority } from "@prisma/client";



// ---------------------------------------------------------------------------
// LLM — local Ollama instance (points to the docker-compose service)
// ---------------------------------------------------------------------------
const llm = new ChatOpenAI({
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL || "http://localhost:11434/v1",
    },
    model: process.env.OPENAI_MODEL_NAME || "llama3",
    apiKey: process.env.OPENAI_API_KEY || "not-needed-for-local",
    temperature: 0.3,
});

// ---------------------------------------------------------------------------
// Agent State
// ---------------------------------------------------------------------------
const AgentState = Annotation.Root({
    input: Annotation<string>(),
    projectId: Annotation<string>(),
    result: Annotation<string>({ default: () => "", reducer: (_, n) => n }),
    messages: Annotation<string[]>({ default: () => [], reducer: (a, b) => [...a, ...b] }),
});

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
const generateIssueTool = tool(
    async ({ projectId, description, priority }) => {
        const project = await prisma.pmProject.findUnique({ where: { id: projectId } });
        if (!project) return `Error: project ${projectId} not found`;

        const prompt = `You are a product manager writing a Jira-style ticket.
Based on this request: "${description}"
Write a concise, actionable issue title in ≤10 words and a short acceptance criteria description (3-5 bullet points).
Respond as JSON: { "title": "...", "description": "..." }`;

        const response = await llm.invoke(prompt);
        let parsed: { title: string; description: string };
        try {
            parsed = JSON.parse(response.content as string);
        } catch {
            return `Failed to parse LLM response: ${response.content}`;
        }

        const count = await prisma.pmIssue.count({ where: { projectId } });
        const systemUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
        if (!systemUser) return "Error: no system user to assign as creator";

        const issue = await prisma.pmIssue.create({
            data: {
                key: `${project.key}-${count + 1}`,
                projectId,
                title: parsed.title,
                description: parsed.description,
                priority: (priority as PmIssuePriority) ?? PmIssuePriority.MEDIUM,
                status: PmIssueStatus.BACKLOG,
                creatorId: systemUser.id,
            },
        });

        return `Created issue ${issue.key}: "${issue.title}"`;
    },
    {
        name: "generate_issue",
        description: "Generate a structured PM issue from a natural language description using the LLM",
        schema: z.object({
            projectId: z.string(),
            description: z.string(),
            priority: z.nativeEnum(PmIssuePriority).optional(),
        }),
    }
);

const detectDuplicatesTool = tool(
    async ({ projectId, newTitle }) => {
        const issues = await prisma.pmIssue.findMany({
            where: { projectId },
            select: { key: true, title: true },
        });

        if (issues.length === 0) return "No existing issues to compare against.";

        const prompt = `You are a duplicate detection assistant.
New issue title: "${newTitle}"

Existing issues:
${issues.map((i) => `- ${i.key}: ${i.title}`).join("\n")}

List any issues that are likely duplicates (same intent/scope). If none, say "No duplicates found."
Format: "Potential duplicates: FPM-X, FPM-Y" or "No duplicates found."`;

        const response = await llm.invoke(prompt);
        return response.content as string;
    },
    {
        name: "detect_duplicates",
        description: "Check if a new issue title is likely a duplicate of existing issues",
        schema: z.object({ projectId: z.string(), newTitle: z.string() }),
    }
);

const analyzeSprintHealthTool = tool(
    async ({ sprintId }) => {
        const sprint = await prisma.pmSprint.findUnique({
            where: { id: sprintId },
            include: { issues: true },
        });
        if (!sprint) return `Sprint ${sprintId} not found`;

        const total = sprint.issues.length;
        const done = sprint.issues.filter((i: any) => i.status === "DONE").length;
        const inProgress = sprint.issues.filter((i: any) => i.status === "IN_PROGRESS").length;
        const blocked = sprint.issues.filter((i: any) => i.status === "BACKLOG").length;
        const points = sprint.issues.reduce((s: number, i: any) => s + (i.storyPoints ?? 0), 0);
        const donePoints = sprint.issues.filter((i: any) => i.status === "DONE").reduce((s: number, i: any) => s + (i.storyPoints ?? 0), 0);

        const prompt = `Sprint health analysis:
Sprint: ${sprint.name}
Total issues: ${total}, Done: ${done}, In Progress: ${inProgress}, Still in Backlog: ${blocked}
Story points: ${donePoints}/${points} completed

Provide a concise 3-point health report covering:
1. Risk level (Low/Medium/High)
2. Key concerns
3. Recommended action`;

        const response = await llm.invoke(prompt);
        return response.content as string;
    },
    {
        name: "analyze_sprint_health",
        description: "Analyze the health and risks of an active sprint",
        schema: z.object({ sprintId: z.string() }),
    }
);

const autoPrioritizeBacklogTool = tool(
    async ({ projectId }) => {
        const issues = await prisma.pmIssue.findMany({
            where: { projectId, status: PmIssueStatus.BACKLOG },
            select: { key: true, title: true, storyPoints: true, priority: true },
            orderBy: { createdAt: "asc" },
            take: 20,
        });

        if (issues.length === 0) return "Backlog is empty.";

        const prompt = `You are an agile product manager. Prioritize this backlog (highest value, lowest effort first).
Issues:
${issues.map((i) => `- ${i.key}: "${i.title}" (${i.storyPoints ?? "?"}pts, current priority: ${i.priority})`).join("\n")}

Return a prioritized list as: "1. FPM-X — reason\n2. FPM-Y — reason..."`;

        const response = await llm.invoke(prompt);
        return response.content as string;
    },
    {
        name: "auto_prioritize_backlog",
        description: "Suggest a prioritized ordering of backlog items",
        schema: z.object({ projectId: z.string() }),
    }
);

const tools = [generateIssueTool, detectDuplicatesTool, analyzeSprintHealthTool, autoPrioritizeBacklogTool] as any[];
const llmWithTools = llm.bindTools(tools);

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------
async function agentNode(state: typeof AgentState.State) {
    const response = await llmWithTools.invoke(state.input);
    return { messages: [state.input, response.content as string], result: response.content as string };
}

const graph = new StateGraph(AgentState)
    .addNode("agent", agentNode)
    .addEdge("__start__", "agent")
    .addEdge("agent", END);

export const pmAgent = graph.compile();

// ---------------------------------------------------------------------------
// Convenience runner
// ---------------------------------------------------------------------------
export async function runPmAgent(input: string, projectId: string): Promise<string> {
    const result = await pmAgent.invoke({ input, projectId });
    return result.result;
}

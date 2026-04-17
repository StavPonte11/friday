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
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { PmIssueStatus, PmIssuePriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLLMProvider } from "@/lib/ai/provider";

// ---------------------------------------------------------------------------
// LLM — retrieved from provider registry
// ---------------------------------------------------------------------------
const llm = getLLMProvider();

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

const assignIssueTool = tool(
    async ({ issueKey, assigneeId }) => {
        try {
            const issue = await prisma.pmIssue.update({
                where: { key: issueKey },
                data: { assigneeId }
            });
            return `Assigned issue ${issue.key} to user ${assigneeId}.`;
        } catch (error: any) {
            return `Error assigning issue: ${error.message}`;
        }
    },
    {
        name: "assign_issue",
        description: "Assign a specific issue (by key) to a user.",
        schema: z.object({ issueKey: z.string(), assigneeId: z.string() })
    }
);

const updateIssueStatusTool = tool(
    async ({ issueKey, status }) => {
        try {
            const issue = await prisma.pmIssue.update({
                where: { key: issueKey },
                data: { status }
            });
            return `Moved issue ${issue.key} to status ${status}.`;
        } catch (error: any) {
            return `Error updating issue: ${error.message}`;
        }
    },
    {
        name: "update_issue_status",
        description: "Update the status of an issue (e.g. TODO, IN_PROGRESS, DONE).",
        schema: z.object({ issueKey: z.string(), status: z.nativeEnum(PmIssueStatus) })
    }
);

const createSubtasksTool = tool(
    async ({ parentIssueKey, subtasks }) => {
        try {
            const parent = await prisma.pmIssue.findUnique({ where: { key: parentIssueKey }, include: { project: true } });
            if (!parent) return `Parent issue ${parentIssueKey} not found.`;
            
            const results = [];
            let count = await prisma.pmIssue.count({ where: { projectId: parent.projectId } });
            
            for (const subtask of subtasks) {
                count++;
                const newIssue = await prisma.pmIssue.create({
                    data: {
                        key: `${parent.project.key}-${count}`,
                        projectId: parent.projectId,
                        title: subtask.title,
                        description: subtask.description || undefined,
                        creatorId: parent.creatorId,
                    }
                });
                
                await prisma.issueRelation.create({
                    data: {
                        fromIssueId: newIssue.id,
                        toIssueId: parent.id,
                        type: "DEPENDS_ON"
                    }
                });
                results.push(newIssue.key);
            }
            return `Created ${results.length} subtasks: ${results.join(", ")}`;
        } catch (error: any) {
            return `Error creating subtasks: ${error.message}`;
        }
    },
    {
        name: "create_subtasks",
        description: "Create multiple subtask issues that depend on a parent issue.",
        schema: z.object({ 
            parentIssueKey: z.string(), 
            subtasks: z.array(z.object({ title: z.string(), description: z.string().optional() }))
        })
    }
);

export const tools = [generateIssueTool, detectDuplicatesTool, analyzeSprintHealthTool, autoPrioritizeBacklogTool, assignIssueTool, updateIssueStatusTool, createSubtasksTool];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const llmWithTools = (llm as any).bindTools(tools) as typeof llm;

// Exposed for executor to use via createReactAgent
export { llmWithTools };

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PmIssuePriority, PmIssueType } from "@prisma/client";
import { broadcastProjectEvent } from "@/lib/pm/presence-store";
import { notify } from "@/lib/pm/notification-service";

// ─────────────────────────────────────────────────────────────────────────────
// FRIDAY Tool Registry
// All tools expose FRIDAY PM actions to the LangGraph agent.
// Each tool is self-contained and safe to run in the agent loop.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createIssue — Creates a new issue in a project.
 * DESTRUCTIVE: requires user confirmation via the safety layer.
 */
export const createIssueTool = tool(
    async ({ projectId, title, description, priority, assigneeId, type, sprintId }) => {
        const project = await prisma.pmProject.findUnique({ where: { id: projectId } });
        if (!project) return `❌ Project ${projectId} not found`;

        const systemUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
        if (!systemUser) return "❌ No system user found";

        const count = await prisma.pmIssue.count({ where: { projectId } });
        const key = `${project.key}-${count + 1}`;

        const issue = await prisma.pmIssue.create({
            data: {
                key,
                projectId,
                title,
                description,
                priority: (priority as PmIssuePriority) ?? PmIssuePriority.MEDIUM,
                type: (type as PmIssueType) ?? PmIssueType.TASK,
                status: "TODO",
                creatorId: systemUser.id,
                assigneeId: assigneeId ?? null,
                sprintId: sprintId ?? null,
                workspaceId: project.workspaceId,
            },
        });

        // Notify assignee
        if (assigneeId) {
            await notify(assigneeId, "issue_assigned", `You were assigned to ${key}: ${title}`, {
                issueId: issue.id, issueKey: key, issueTitle: title, projectId,
            });
        }

        broadcastProjectEvent(projectId, "issue.created", { issueId: issue.id, issueKey: key, status: issue.status });

        return `✅ Created issue **${key}**: "${title}" (${priority ?? "MEDIUM"} priority)`;
    },
    {
        name: "create_issue",
        description: "Create a new issue in a project from natural language. Use when the user wants to add a task, bug, or story.",
        schema: z.object({
            projectId: z.string().describe("The project ID to create the issue in"),
            title: z.string().describe("Clear, concise issue title (max 80 chars)"),
            description: z.string().optional().describe("Acceptance criteria and context"),
            priority: z.nativeEnum(PmIssuePriority).optional().describe("Issue priority"),
            type: z.nativeEnum(PmIssueType).optional().describe("Issue type"),
            assigneeId: z.string().optional().describe("User ID to assign the issue to"),
            sprintId: z.string().optional().describe("Sprint ID if the issue belongs in a sprint"),
        }),
    }
);

/**
 * updateIssue — Updates an existing issue's fields.
 * DESTRUCTIVE: requires user confirmation.
 */
export const updateIssueTool = tool(
    async ({ issueId, status, priority, assigneeId, title, sprintId }) => {
        const existing = await prisma.pmIssue.findUnique({ where: { id: issueId } });
        if (!existing) return `❌ Issue ${issueId} not found`;

        const data: Record<string, unknown> = {};
        if (status) data.status = status;
        if (priority) data.priority = priority;
        if (assigneeId !== undefined) data.assigneeId = assigneeId;
        if (title) data.title = title;
        if (sprintId !== undefined) data.sprintId = sprintId;

        await prisma.pmIssue.update({ where: { id: issueId }, data });

        // Notify new assignee if changed
        if (assigneeId && assigneeId !== existing.assigneeId) {
            await notify(assigneeId, "issue_assigned", `You were assigned to ${existing.key}: ${existing.title}`, {
                issueId, issueKey: existing.key, issueTitle: existing.title, projectId: existing.projectId,
            });
        }

        broadcastProjectEvent(existing.projectId, "issue.updated", {
            issueId, issueKey: existing.key, status: status ?? existing.status
        });

        return `✅ Updated issue **${existing.key}**: ${Object.keys(data).join(", ")} changed`;
    },
    {
        name: "update_issue",
        description: "Update an existing issue's status, priority, assignee, or title. Use when asked to move, close, or reassign an issue.",
        schema: z.object({
            issueId: z.string().describe("The issue ID to update"),
            status: z.string().optional().describe("New status: todo, in_progress, done, cancelled"),
            priority: z.nativeEnum(PmIssuePriority).optional(),
            assigneeId: z.string().nullable().optional().describe("New assignee user ID, or null to unassign"),
            title: z.string().optional(),
            sprintId: z.string().nullable().optional().describe("Move to sprint, or null to send to backlog"),
        }),
    }
);

/**
 * getIssues — Retrieves issues from a project with optional filters.
 * READ-ONLY. Always safe.
 */
export const getIssuesTool = tool(
    async ({ projectId, status, assigneeId, priority, limit }) => {
        const where: Record<string, unknown> = { projectId, deletedAt: null };
        if (status) where.status = { in: status.split(",").map(s => s.trim()) };
        if (assigneeId) where.assigneeId = assigneeId;
        if (priority) where.priority = priority;

        const issues = await prisma.pmIssue.findMany({
            where,
            take: limit ?? 20,
            orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
            select: {
                key: true, title: true, status: true, priority: true,
                assignee: { select: { name: true } },
                dueDate: true, storyPoints: true,
            },
        });

        if (issues.length === 0) return "No issues found matching the filter.";

        return issues.map(i => (
            `• **${i.key}** [${i.status}/${i.priority}]${i.assignee ? ` @${i.assignee.name}` : ""}: ${i.title}` +
            (i.dueDate ? ` (due ${new Date(i.dueDate).toLocaleDateString()})` : "")
        )).join("\n");
    },
    {
        name: "get_issues",
        description: "Retrieve issues from a project with optional filters. Use to answer questions like 'what are the blockers?' or 'show open issues for Alice'.",
        schema: z.object({
            projectId: z.string(),
            status: z.string().optional().describe("Comma-separated statuses: 'todo,in_progress'"),
            assigneeId: z.string().optional(),
            priority: z.nativeEnum(PmIssuePriority).optional(),
            limit: z.number().int().max(50).optional().default(20),
        }),
    }
);

/**
 * assignIssue — Assigns or reassigns an issue to a user.
 * DESTRUCTIVE but lightweight; still confirmation-flagged.
 */
export const assignIssueTool = tool(
    async ({ issueId, assigneeId }) => {
        const [issue, user] = await Promise.all([
            prisma.pmIssue.findUnique({ where: { id: issueId }, select: { key: true, title: true, projectId: true } }),
            prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true } }),
        ]);

        if (!issue) return `❌ Issue ${issueId} not found`;
        if (!user) return `❌ User ${assigneeId} not found`;

        await prisma.pmIssue.update({ where: { id: issueId }, data: { assigneeId } });

        await notify(assigneeId, "issue_assigned", `You were assigned to ${issue.key}: ${issue.title}`, {
            issueId, issueKey: issue.key, issueTitle: issue.title, projectId: issue.projectId,
        });

        return `✅ Assigned **${issue.key}** to **${user.name}**`;
    },
    {
        name: "assign_issue",
        description: "Assign an issue to a specific user. Use when asked to reassign or balance workload.",
        schema: z.object({
            issueId: z.string().describe("Issue ID"),
            assigneeId: z.string().describe("User ID to assign to"),
        }),
    }
);

/**
 * getSprintData — Returns full sprint health data.
 * READ-ONLY.
 */
export const getSprintDataTool = tool(
    async ({ sprintId, projectId }) => {
        const where = sprintId
            ? { id: sprintId }
            : { projectId, status: "ACTIVE" as const };

        const sprint = await prisma.pmSprint.findFirst({
            where,
            include: {
                issues: {
                    select: { key: true, title: true, status: true, priority: true, storyPoints: true, assigneeId: true },
                },
            },
        });

        if (!sprint) return "No active sprint found.";

        const total = sprint.issues.length;
        const done = sprint.issues.filter(i => i.status === "done").length;
        const inProgress = sprint.issues.filter(i => i.status === "in_progress").length;
        const todo = sprint.issues.filter(i => i.status === "todo").length;
        const points = sprint.issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
        const donePoints = sprint.issues.filter(i => i.status === "done").reduce((s, i) => s + (i.storyPoints ?? 0), 0);
        const velocity = points > 0 ? Math.round((donePoints / points) * 100) : 0;

        return [
            `**Sprint: ${sprint.name}** (${sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : "?"} → ${sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : "?"})`,
            `Progress: ${done}/${total} issues (${velocity}% points done)`,
            `Status breakdown: ${done} done · ${inProgress} in progress · ${todo} todo`,
            `Points: ${donePoints}/${points}`,
            sprint.issues.filter(i => i.status !== "done").length > 0
                ? `\nOpen issues:\n` + sprint.issues
                    .filter(i => i.status !== "done")
                    .map(i => `  • ${i.key} [${i.status}]: ${i.title} (${i.storyPoints ?? "?"}pts)`)
                    .join("\n")
                : "\n✅ All issues complete!",
        ].join("\n");
    },
    {
        name: "get_sprint_data",
        description: "Get full data and health metrics for a sprint. Use to answer 'what's the sprint status?' or 'show blockers in sprint'.",
        schema: z.object({
            sprintId: z.string().optional().describe("Specific sprint ID, or omit to get the active sprint"),
            projectId: z.string().optional().describe("Required if sprintId is omitted"),
        }),
    }
);

/**
 * searchIssues — Semantic + keyword search across all issues.
 * READ-ONLY.
 */
export const searchIssuesTool = tool(
    async ({ query, projectId, limit }) => {
        const issues = await prisma.pmIssue.findMany({
            where: {
                deletedAt: null,
                ...(projectId ? { projectId } : {}),
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                    { key: { contains: query, mode: "insensitive" } },
                ],
            },
            take: limit ?? 10,
            select: { key: true, title: true, status: true, priority: true },
        });

        if (issues.length === 0) return `No issues found matching "${query}"`;

        return `Found ${issues.length} issues:\n` +
            issues.map(i => `• **${i.key}** [${i.status}]: ${i.title}`).join("\n");
    },
    {
        name: "search_issues",
        description: "Search for issues by keyword. Use to answer 'is there an issue about X?' or find relevant tickets.",
        schema: z.object({
            query: z.string().describe("Search keywords"),
            projectId: z.string().optional(),
            limit: z.number().int().max(20).optional().default(10),
        }),
    }
);

/**
 * getTeamWorkload — Shows how many issues each team member has.
 * READ-ONLY.
 */
export const getTeamWorkloadTool = tool(
    async ({ projectId }) => {
        const issues = await prisma.pmIssue.findMany({
            where: { projectId, deletedAt: null, status: { notIn: ["done", "cancelled"] } },
            select: { assigneeId: true, assignee: { select: { name: true } }, priority: true, storyPoints: true },
        });

        const byAssignee: Record<string, { name: string; count: number; points: number; critical: number }> = {};

        for (const issue of issues) {
            const id = issue.assigneeId ?? "unassigned";
            const name = issue.assignee?.name ?? "Unassigned";
            if (!byAssignee[id]) byAssignee[id] = { name, count: 0, points: 0, critical: 0 };
            byAssignee[id].count++;
            byAssignee[id].points += issue.storyPoints ?? 0;
            if (issue.priority === PmIssuePriority.URGENT || issue.priority === PmIssuePriority.HIGH) byAssignee[id].critical++;
        }

        const rows = Object.values(byAssignee).sort((a, b) => b.count - a.count);
        if (rows.length === 0) return "No open issues assigned.";

        return "**Team Workload (open issues):**\n" +
            rows.map(r => `• ${r.name}: ${r.count} issues (${r.points}pts, ${r.critical} high/critical)`).join("\n");
    },
    {
        name: "get_team_workload",
        description: "Show current workload distribution across team members. Use to detect overloaded developers.",
        schema: z.object({
            projectId: z.string(),
        }),
    }
);

// ─── Destructive tool names (require confirmation from safety layer) ───────────
export const DESTRUCTIVE_TOOLS = new Set(["create_issue", "update_issue", "assign_issue"]);

// ─── Full tool registry ────────────────────────────────────────────────────────
export const ALL_TOOLS = [
    createIssueTool,
    updateIssueTool,
    getIssuesTool,
    assignIssueTool,
    getSprintDataTool,
    searchIssuesTool,
    getTeamWorkloadTool,
];

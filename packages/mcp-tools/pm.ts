/**
 * MCP Tools: Friday PM Module
 * These tool definitions expose PM actions to any MCP-compatible agent or LLM.
 */

export const pmMcpTools = [
    {
        name: "pm_list_issues",
        description: "List open issues in a Friday PM project, optionally filtered by status or assignee.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "The Friday PM project ID." },
                status: {
                    type: "string",
                    enum: ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELED"],
                    description: "Filter by issue status.",
                },
                assigneeId: { type: "string", description: "Filter by assignee user ID." },
            },
            required: ["projectId"],
        },
    },
    {
        name: "pm_create_issue",
        description: "Create a new issue in a Friday PM project from a description.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "The Friday PM project ID." },
                title: { type: "string", description: "Issue title." },
                description: { type: "string", description: "Issue description or acceptance criteria." },
                priority: {
                    type: "string",
                    enum: ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"],
                    description: "Issue priority level.",
                },
                assigneeId: { type: "string", description: "Optional assignee user ID." },
            },
            required: ["projectId", "title"],
        },
    },
    {
        name: "pm_update_status",
        description: "Update the status of an existing Friday PM issue.",
        inputSchema: {
            type: "object",
            properties: {
                issueKey: { type: "string", description: "Issue key, e.g. FPM-42." },
                status: {
                    type: "string",
                    enum: ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELED"],
                    description: "New status for the issue.",
                },
            },
            required: ["issueKey", "status"],
        },
    },
    {
        name: "pm_analyze_sprint",
        description: "Ask the AI to analyze the health of the current active sprint.",
        inputSchema: {
            type: "object",
            properties: {
                sprintId: { type: "string", description: "The sprint ID to analyze." },
            },
            required: ["sprintId"],
        },
    },
    {
        name: "pm_generate_issue_from_description",
        description: "Use AI to auto-generate a well-structured issue from a natural language description.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string" },
                description: { type: "string", description: "Natural language description of the work needed." },
            },
            required: ["projectId", "description"],
        },
    },
    {
        name: "pm_generate_issue_insights",
        description: "Use AI to estimate complexity, predicted completion time, and required skills for an existing issue.",
        inputSchema: {
            type: "object",
            properties: {
                issueId: { type: "string", description: "The ID of the PM issue to analyze." },
            },
            required: ["issueId"],
        },
    },
    {
        name: "pm_recommend_sprint",
        description: "Ask the AI to recommend an optimal sprint plan for a project, selecting issues from the backlog to fit the team velocity.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "The Friday PM project ID." },
                targetVelocity: { type: "number", description: "Team velocity in story points for the sprint. Defaults to 30." },
            },
            required: ["projectId"],
        },
    },
    {
        name: "pm_move_issue",
        description: "Move an issue to a different status column on the board (e.g. from TODO to IN_PROGRESS).",
        inputSchema: {
            type: "object",
            properties: {
                issueId: { type: "string", description: "The ID of the PM issue to move." },
                status: {
                    type: "string",
                    enum: ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELED"],
                    description: "The new status for the issue.",
                },
            },
            required: ["issueId", "status"],
        },
    },
];

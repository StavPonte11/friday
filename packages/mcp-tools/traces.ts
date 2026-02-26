/**
 * MCP Tools: Friday Traces Module
 * Expose observability data from LangFuse to any MCP-compatible agent.
 */

export const tracesMcpTools = [
    {
        name: "traces_list_sessions",
        description: "List recent LangFuse tracing sessions for the workspace.",
        inputSchema: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Max sessions to return (default 20).", default: 20 },
                userId: { type: "string", description: "Optional filter by user ID." },
            },
            required: [],
        },
    },
    {
        name: "traces_get_session",
        description: "Retrieve the full trace waterfall for a specific LangFuse session.",
        inputSchema: {
            type: "object",
            properties: {
                sessionId: { type: "string", description: "The LangFuse session ID." },
            },
            required: ["sessionId"],
        },
    },
    {
        name: "traces_get_metrics",
        description: "Retrieve model usage metrics: token counts, latency, cost breakdown.",
        inputSchema: {
            type: "object",
            properties: {
                fromDate: { type: "string", format: "date", description: "Start date (YYYY-MM-DD)." },
                toDate: { type: "string", format: "date", description: "End date (YYYY-MM-DD)." },
                model: { type: "string", description: "Optional filter by model name." },
            },
            required: [],
        },
    },
    {
        name: "traces_list_prompts",
        description: "List versioned prompts stored in LangFuse.",
        inputSchema: {
            type: "object",
            properties: {
                tag: { type: "string", description: "Optional filter by tag." },
            },
            required: [],
        },
    },
];

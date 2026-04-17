import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PmIssuePriority, PmIssueType } from "@prisma/client";

// ─── MCP Tool Definitions ────────────────────────────────────────────────────

const tools = [
    {
        name: "pm_createIssue",
        description: "Create a new issue in a FRIDAY PM project. Returns the created issue.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "The ID of the project" },
                title: { type: "string", description: "Issue title (required)" },
                description: { type: "string", description: "Detailed description of the issue" },
                priority: { type: "string", enum: ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"], default: "NONE" },
                type: { type: "string", enum: ["INITIATIVE", "EPIC", "STORY", "TASK", "SUBTASK"], default: "TASK" },
                assigneeId: { type: "string", description: "User ID to assign the issue to" },
                storyPoints: { type: "number", description: "Story points estimate" },
                sprintId: { type: "string", description: "Sprint ID to add the issue to" },
                creatorId: { type: "string", description: "User ID creating the issue (agent service account)" },
            },
            required: ["projectId", "title", "creatorId"],
        }
    },
    {
        name: "pm_updateIssue",
        description: "Update fields on an existing FRIDAY PM issue.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "The issue ID" },
                title: { type: "string" },
                description: { type: "string" },
                status: { type: "string", description: "Status value (e.g. TODO, IN_PROGRESS, DONE)" },
                priority: { type: "string", enum: ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] },
                assigneeId: { type: "string" },
                storyPoints: { type: "number" },
                sprintId: { type: "string" },
                actorId: { type: "string", description: "User ID performing the update" },
            },
            required: ["id", "actorId"],
        }
    },
    {
        name: "pm_assignIssue",
        description: "Assign or unassign a user to an issue.",
        inputSchema: {
            type: "object",
            properties: {
                issueId: { type: "string" },
                assigneeId: { type: "string", description: "User ID to assign, or null to unassign" },
                actorId: { type: "string" },
            },
            required: ["issueId", "actorId"],
        }
    },
    {
        name: "pm_moveIssue",
        description: "Move an issue to a different status column or sprint.",
        inputSchema: {
            type: "object",
            properties: {
                issueId: { type: "string" },
                status: { type: "string", description: "New status (e.g. IN_PROGRESS, DONE)" },
                sprintId: { type: "string", description: "New sprint ID, or null for backlog" },
                actorId: { type: "string" },
            },
            required: ["issueId", "actorId"],
        }
    },
    {
        name: "pm_commentIssue",
        description: "Add a comment to a FRIDAY PM issue.",
        inputSchema: {
            type: "object",
            properties: {
                issueId: { type: "string" },
                content: { type: "string", description: "Comment text (markdown supported)" },
                authorId: { type: "string", description: "User ID of the commenter" },
            },
            required: ["issueId", "content", "authorId"],
        }
    },
    {
        name: "pm_queryIssues",
        description: "Query issues with filters. Returns a list of matching issues.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string" },
                status: { type: "string" },
                assigneeId: { type: "string" },
                sprintId: { type: "string" },
                search: { type: "string", description: "Full-text search in title and description" },
                take: { type: "number", description: "Max results (default 20, max 100)", default: 20 },
            },
            required: ["projectId"],
        }
    },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>) {
    switch (name) {
        case "pm_createIssue": {
            const input = z.object({
                projectId: z.string(),
                title: z.string(),
                description: z.string().optional(),
                priority: z.nativeEnum(PmIssuePriority).optional().default(PmIssuePriority.NONE),
                type: z.nativeEnum(PmIssueType).optional().default(PmIssueType.TASK),
                assigneeId: z.string().optional(),
                storyPoints: z.number().optional(),
                sprintId: z.string().optional(),
                creatorId: z.string(),
            }).parse(args);

            const project = await prisma.pmProject.findUnique({ where: { id: input.projectId } });
            if (!project) throw new Error("Project not found");

            const count = await prisma.pmIssue.count({ where: { projectId: input.projectId } });
            return prisma.pmIssue.create({
                data: { ...input, key: `${project.key}-${count + 1}` }
            });
        }

        case "pm_updateIssue": {
            const input = z.object({
                id: z.string(),
                title: z.string().optional(),
                description: z.string().optional().nullable(),
                status: z.string().optional(),
                priority: z.nativeEnum(PmIssuePriority).optional(),
                assigneeId: z.string().optional().nullable(),
                storyPoints: z.number().optional().nullable(),
                sprintId: z.string().optional().nullable(),
                actorId: z.string(),
            }).parse(args);
            const { id, actorId, ...data } = input;
            return prisma.pmIssue.update({ where: { id }, data });
        }

        case "pm_assignIssue": {
            const input = z.object({
                issueId: z.string(),
                assigneeId: z.string().optional().nullable(),
                actorId: z.string(),
            }).parse(args);
            return prisma.pmIssue.update({
                where: { id: input.issueId },
                data: { assigneeId: input.assigneeId ?? null }
            });
        }

        case "pm_moveIssue": {
            const input = z.object({
                issueId: z.string(),
                status: z.string().optional(),
                sprintId: z.string().optional().nullable(),
                actorId: z.string(),
            }).parse(args);
            const { issueId, actorId, ...data } = input;
            return prisma.pmIssue.update({ where: { id: issueId }, data });
        }

        case "pm_commentIssue": {
            const input = z.object({
                issueId: z.string(),
                content: z.string(),
                authorId: z.string(),
            }).parse(args);
            return prisma.pmComment.create({ data: input });
        }

        case "pm_queryIssues": {
            const input = z.object({
                projectId: z.string(),
                status: z.string().optional(),
                assigneeId: z.string().optional(),
                sprintId: z.string().optional(),
                search: z.string().optional(),
                take: z.number().int().min(1).max(100).default(20),
            }).parse(args);

            const where: any = { projectId: input.projectId };
            if (input.status) where.status = input.status;
            if (input.assigneeId) where.assigneeId = input.assigneeId;
            if (input.sprintId) where.sprintId = input.sprintId;
            if (input.search) where.OR = [
                { title: { contains: input.search, mode: "insensitive" } },
                { description: { contains: input.search, mode: "insensitive" } },
            ];

            return prisma.pmIssue.findMany({
                where,
                include: { assignee: { select: { id: true, name: true } }, sprint: { select: { id: true, name: true } } },
                orderBy: { updatedAt: "desc" },
                take: input.take,
            });
        }

        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}

// ─── MCP Route Handler ───────────────────────────────────────────────────────

/**
 * MCP (Model Context Protocol) server endpoint.
 * Exposes PM tools to FRIDAY agents and external AI systems.
 * 
 * GET /api/mcp → Returns tool list
 * POST /api/mcp → Execute a tool call
 */
export async function GET() {
    return NextResponse.json({
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "friday-pm", version: "1.0.0" },
        tools,
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // MCP JSON-RPC format
        const { method, params, id } = body;

        if (method === "tools/list") {
            return NextResponse.json({ jsonrpc: "2.0", id, result: { tools } });
        }

        if (method === "tools/call") {
            const { name, arguments: args } = params ?? {};
            if (!name) {
                return NextResponse.json({
                    jsonrpc: "2.0", id,
                    error: { code: -32602, message: "Missing tool name" }
                }, { status: 400 });
            }

            try {
                const result = await executeTool(name, args ?? {});
                return NextResponse.json({
                    jsonrpc: "2.0", id,
                    result: {
                        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                        isError: false,
                    }
                });
            } catch (toolError) {
                return NextResponse.json({
                    jsonrpc: "2.0", id,
                    result: {
                        content: [{ type: "text", text: String(toolError) }],
                        isError: true,
                    }
                });
            }
        }

        return NextResponse.json({
            jsonrpc: "2.0", id,
            error: { code: -32601, message: `Method not found: ${method}` }
        }, { status: 404 });
    } catch (error) {
        return NextResponse.json({
            jsonrpc: "2.0", id: null,
            error: { code: -32700, message: "Parse error" }
        }, { status: 400 });
    }
}

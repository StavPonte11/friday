import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { pmMcpTools } from "./pm";
import { prisma } from "@/lib/prisma";

export const mcpServer = new Server({
    name: "friday-pm-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    }
});

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: pmMcpTools,
    };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
        switch (name) {
            case "pm_list_issues": {
                const { projectId, status, assigneeId } = args as { projectId: string; status?: any; assigneeId?: string };
                const issues = await prisma.pmIssue.findMany({
                    where: {
                        projectId,
                        status: status ? status : undefined,
                        assigneeId: assigneeId ? assigneeId : undefined
                    },
                    select: { id: true, key: true, title: true, status: true }
                });
                return { content: [{ type: "text", text: JSON.stringify(issues, null, 2) }] };
            }
                
            case "pm_create_issue": {
                const { projectId, title, description, priority, assigneeId } = args as any;
                
                // Get project to find workspace
                const project = await prisma.pmProject.findUnique({ where: { id: projectId }});
                if (!project) throw new Error("Project not found");
                
                const issueCount = await prisma.pmIssue.count({ where: { projectId } });
                const issuePrefix = project.key.toUpperCase();
                
                const issue = await prisma.pmIssue.create({
                    data: {
                        projectId,
                        title,
                        description,
                        priority: priority || "MEDIUM",
                        key: `${issuePrefix}-${issueCount + 1}`,
                        creatorId: "mcp-agent", // Default fallback if no context user
                        assigneeId
                    }
                });
                return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
            }

            case "pm_update_status": {
                const { issueKey, status } = args as any;
                const issue = await prisma.pmIssue.update({
                    where: { key: issueKey },
                    data: { status }
                });
                return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
            }

            // Note: The AI-related tools (analyze_sprint, generate_from_description) 
            // should ideally hook into the PM Agent loop, returning text summaries here.
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error: any) {
        return {
            isError: true,
            content: [{ type: "text", text: `Error executing tool: ${error?.message}` }]
        };
    }
});

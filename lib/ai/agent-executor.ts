import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { llmWithTools, tools } from "./pm-agent";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { HumanMessage } from "@langchain/core/messages";

const pmReactAgent = createReactAgent({
    llm: llmWithTools as any,
    tools,
});

export async function executePmAgent(input: string, projectId: string, userId: string) {
    const project = await prisma.pmProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    // Start execution span (mocking trace here or hooking up actual Langfuse Tracer as needed)
    // See LangChain native Langfuse Tracer docs.
    const runId = `run_${Date.now()}`;
    
    await auditLog({
        workspaceId: project.workspaceId,
        userId,
        action: "pm_agent.started",
        entityType: "AgentRun",
        entityId: runId,
        details: { input, projectId }
    });

    try {
        const result = await pmReactAgent.invoke({
            messages: [
                new HumanMessage({
                    content: `You are the PM Agent for Project ${project.key}. Request: ${input}`
                })
            ]
        });

        const finalMessage = result.messages[result.messages.length - 1];
        
        await auditLog({
            workspaceId: project.workspaceId,
            userId,
            action: "pm_agent.completed",
            entityType: "AgentRun",
            entityId: runId,
            details: { output: finalMessage?.content, steps: result.messages.length }
        });

        return {
            output: typeof finalMessage.content === "string" ? finalMessage.content : JSON.stringify(finalMessage.content),
            runId
        };
    } catch (error: any) {
        await auditLog({
            workspaceId: project.workspaceId,
            userId,
            action: "pm_agent.failed",
            entityType: "AgentRun",
            entityId: runId,
            details: { error: error.message }
        });
        throw error;
    }
}

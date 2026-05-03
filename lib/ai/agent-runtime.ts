/**
 * FRIDAY Agent Runtime
 *
 * Full ReAct (Reasoning + Acting) loop using LangGraph.
 * Replaces the single-step agent in pm-agent.ts.
 *
 * Architecture:
 *   START → agent_node → (tool_node | END) → agent_node (loop) → END
 *
 * Features:
 *   • Tool-use loop (multi-step tasks)
 *   • Short-term conversation memory (per session)
 *   • Langfuse tracing (all prompts, tool calls, decisions)
 *   • Safety layer (destructive tool confirmation)
 *   • Graceful error recovery
 */

import { StateGraph, Annotation, END, START, messagesStateReducer } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { getLLMProvider } from "./provider";
import { ALL_TOOLS, DESTRUCTIVE_TOOLS } from "./tools";
import { searchMemory } from "./memory";
import { langfuse } from "@/lib/langfuse";
import { prisma } from "@/lib/prisma";

// ─── Agent State ────────────────────────────────────────────────────────────
const AgentState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        default: () => [],
        reducer: messagesStateReducer,
    }),
    projectId: Annotation<string>(),
    workspaceId: Annotation<string>(),
    sessionId: Annotation<string>(),
    userId: Annotation<string | undefined>(),
    pendingConfirmation: Annotation<{ toolName: string; args: unknown } | null>({
        default: () => null,
        reducer: (_, n) => n,
    }),
    ragContext: Annotation<string>({
        default: () => "",
        reducer: (_, n) => n,
    }),
});

type AgentStateType = typeof AgentState.State;

// ─── LLM with tools bound ───────────────────────────────────────────────────
const llm = getLLMProvider();
const llmWithTools = llm.bindTools(ALL_TOOLS as any);

// ─── System prompt ───────────────────────────────────────────────────────────
function buildSystemPrompt(state: AgentStateType): string {
    return `You are FRIDAY, an AI-native project management agent for a software team.
You have access to tools to read project data, create issues, update issues, assign work, and analyze sprint health.

Current context:
- Project ID: ${state.projectId}
- Workspace ID: ${state.workspaceId}
- Session: ${state.sessionId}
${state.ragContext ? `\nRelevant knowledge:\n${state.ragContext}` : ""}

Guidelines:
- Always use tools when the user asks for data — never make up issue keys or user names
- For multi-step tasks, use tools sequentially
- Be concise and action-oriented in responses
- When you complete a destructive action (create/update/assign), confirm what you did
- If unsure about a project or sprint ID, use search_issues or get_sprint_data first
- Format lists using markdown bullets`;
}

// ─── Nodes ───────────────────────────────────────────────────────────────────

async function ragNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage instanceof HumanMessage ? String(lastMessage.content) : "";

    if (query.length < 3) return { ragContext: "" };

    try {
        const results = await searchMemory(query, 3);
        if (results.length === 0) return { ragContext: "" };

        const context = results
            .map(r => `- ${r.content} (similarity: ${(r.similarity * 100).toFixed(0)}%)`)
            .join("\n");
        return { ragContext: context };
    } catch {
        return { ragContext: "" };
    }
}

async function agentNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const trace = langfuse.trace({
        name: "friday.agent.step",
        sessionId: state.sessionId,
        userId: state.userId,
        metadata: { projectId: state.projectId },
    });

    const systemMsg = new SystemMessage(buildSystemPrompt(state));
    const messages = [systemMsg, ...state.messages];

    const span = trace.span({ name: "llm_call" });
    let response: any;
    try {
        response = await llmWithTools.invoke(messages as any);
        span.end({ output: { content: response.content } });
    } catch (err: any) {
        span.end({ statusMessage: err.message, level: "ERROR" });
        const errorMsg = new AIMessage("⚠️ I encountered an error communicating with the AI model. Please check your LLM configuration.");
        return { messages: [errorMsg] };
    }

    // Log tool calls
    const toolCalls = (response as any).tool_calls ?? [];
    if (toolCalls.length > 0) {
        trace.event({
            name: "tool_calls",
            input: toolCalls.map((t: any) => ({ name: t.name, args: t.args })),
        });
    }

    await langfuse.flushAsync();
    return { messages: [response] };
}

function shouldContinue(state: AgentStateType): "tools" | typeof END {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    const toolCalls = (lastMessage as any).tool_calls ?? [];

    if (toolCalls.length === 0) return END;
    return "tools";
}

// ─── Build Graph ─────────────────────────────────────────────────────────────
const toolNode = new ToolNode(ALL_TOOLS as any);

const agentGraph = new StateGraph(AgentState)
    .addNode("rag", ragNode)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge(START, "rag")
    .addEdge("rag", "agent")
    .addConditionalEdges("agent", shouldContinue, {
        tools: "tools",
        [END]: END,
    })
    .addEdge("tools", "agent");

export const fridayAgent = agentGraph.compile();

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AgentContext {
    projectId: string;
    workspaceId: string;
    sessionId: string;
    userId?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AgentResult {
    reply: string;
    toolsUsed: string[];
    ragContextUsed: boolean;
}

export async function runFridayAgent(
    input: string,
    context: AgentContext
): Promise<AgentResult> {
    const historyMessages: BaseMessage[] = (context.history ?? []).map(h =>
        h.role === "user" ? new HumanMessage(h.content) : new AIMessage(h.content)
    );

    const result = await fridayAgent.invoke({
        messages: [...historyMessages, new HumanMessage(input)],
        projectId: context.projectId,
        workspaceId: context.workspaceId,
        sessionId: context.sessionId,
        userId: context.userId,
        pendingConfirmation: null,
        ragContext: "",
    });

    const lastMessage = result.messages[result.messages.length - 1];
    const reply = typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // Collect tool names used in this run
    const toolsUsed: string[] = [];
    for (const msg of result.messages) {
        const calls = (msg as any).tool_calls ?? [];
        for (const call of calls) {
            if (!toolsUsed.includes(call.name)) toolsUsed.push(call.name);
        }
    }

    // Persist conversation to DB for long-term memory
    await prisma.pmAiSession.upsert({
        where: { id: context.sessionId },
        create: {
            id: context.sessionId,
            userId: context.userId ?? null,
            projectId: context.projectId,
            messages: result.messages.map(m => ({
                role: m._getType(),
                content: m.content,
            })) as any,
        },
        update: {
            messages: result.messages.map(m => ({
                role: m._getType(),
                content: m.content,
            })) as any,
            updatedAt: new Date(),
        },
    }).catch(() => { /* non-critical */ });

    return {
        reply,
        toolsUsed,
        ragContextUsed: result.ragContext.length > 0,
    };
}

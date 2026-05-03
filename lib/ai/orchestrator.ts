import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { getLLMProvider } from "./provider";
import { langfuse } from "@/lib/langfuse";
import { prisma } from "@/lib/prisma";
import { generateSprintPlan } from "./pm-sprint-planning";

const OrchestratorState = Annotation.Root({
    projectId: Annotation<string>(),
    workspaceId: Annotation<string>(),
    userId: Annotation<string | undefined>(),
    targetVelocity: Annotation<number>({ default: () => 40, reducer: (_, n) => n }),
    sprintPlan: Annotation<any>({ default: () => null, reducer: (_, n) => n }),
    riskReport: Annotation<any>({ default: () => null, reducer: (_, n) => n }),
    workloadReport: Annotation<any>({ default: () => null, reducer: (_, n) => n }),
    finalReport: Annotation<string>({ default: () => "", reducer: (_, n) => n }),
});

type OrchestratorStateType = typeof OrchestratorState.State;
const llm = getLLMProvider();

async function plannerAgent(state: OrchestratorStateType) {
    const span = langfuse.trace({ name: "friday.agent.planner", metadata: { projectId: state.projectId } });
    try {
        const backlog = await prisma.pmIssue.findMany({
            where: { projectId: state.projectId, sprintId: null, deletedAt: null },
            select: { id: true, title: true, complexityScore: true, priority: true },
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
            take: 30,
        });
        if (backlog.length === 0) return { sprintPlan: { recommendedIssueIds: [], reasoning: "Backlog empty.", estimatedVelocity: 0 } };
        const plan = await generateSprintPlan(backlog.map(i => ({ id: i.id, title: i.title, complexityScore: i.complexityScore ?? null, priority: i.priority })), state.targetVelocity);
        await (span as any).shutdownAsync?.();
        return { sprintPlan: plan };
    } catch (err: any) {
        await (span as any).shutdownAsync?.();
        return { sprintPlan: { recommendedIssueIds: [], reasoning: `Error: ${err.message}`, estimatedVelocity: 0 } };
    }
}

async function riskAgent(state: OrchestratorStateType) {
    const span = langfuse.trace({ name: "friday.agent.risk", metadata: { projectId: state.projectId } });
    try {
        const sprint = await prisma.pmSprint.findFirst({
            where: { projectId: state.projectId, status: "ACTIVE" },
            include: { issues: { select: { status: true, priority: true, dueDate: true, storyPoints: true } } },
        });
        const prompt = `Analyze sprint risk. Blocked: ${sprint?.issues.filter(i => i.status === "blocked").length ?? 0}. Return JSON: { "riskLevel": "LOW|MEDIUM|HIGH", "risks": [], "mitigations": [] }`;
        const response = await llm.invoke(prompt);
        const text = (response.content as string).trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in risk response");
        await (span as any).shutdownAsync?.();
        return { riskReport: JSON.parse(jsonMatch[0]) };
    } catch (err: any) {
        await (span as any).shutdownAsync?.();
        return { riskReport: { riskLevel: "MEDIUM", risks: [err.message], mitigations: [] } };
    }
}

async function workloadAgent(state: OrchestratorStateType) {
    const span = langfuse.trace({ name: "friday.agent.workload", metadata: { projectId: state.projectId } });
    try {
        const prompt = `Analyze team workload for project ${state.projectId}. Return JSON: { "overloaded": [], "underloaded": [], "suggestions": [] }`;
        const response = await llm.invoke(prompt);
        const text = (response.content as string).trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in workload response");
        await (span as any).shutdownAsync?.();
        return { workloadReport: JSON.parse(jsonMatch[0]) };
    } catch (err: any) {
        await (span as any).shutdownAsync?.();
        return { workloadReport: { overloaded: [], underloaded: [], suggestions: [err.message] } };
    }
}

async function synthesizerAgent(state: OrchestratorStateType) {
    const { sprintPlan, riskReport, workloadReport } = state;
    const sections = ["# 🤖 FRIDAY Agent Report\n"];
    if (sprintPlan) sections.push(`## 📋 Sprint Plan\n${sprintPlan.reasoning}`);
    if (riskReport) sections.push(`## Risk Analysis: ${riskReport.riskLevel}\n${riskReport.risks.join(", ")}`);
    if (workloadReport) sections.push(`## Workload\nOverloaded: ${workloadReport.overloaded.join(", ")}`);
    return { finalReport: sections.join("\n\n") };
}

const orchestratorGraph = new StateGraph(OrchestratorState)
    .addNode("planner", plannerAgent)
    .addNode("risk", riskAgent)
    .addNode("workload", workloadAgent)
    .addNode("synthesizer", synthesizerAgent)
    .addEdge(START, "planner")
    .addEdge("planner", "risk")
    .addEdge("risk", "workload")
    .addEdge("workload", "synthesizer")
    .addEdge("synthesizer", END);

export const fridayOrchestrator = orchestratorGraph.compile();

export async function runOrchestratedAnalysis(projectId: string, workspaceId: string, targetVelocity = 40, userId?: string) {
    const result = await fridayOrchestrator.invoke({ projectId, workspaceId, targetVelocity, userId });
    return result.finalReport;
}

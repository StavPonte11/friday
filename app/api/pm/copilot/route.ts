import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLLMProvider } from "@/lib/ai/provider";

export async function POST(req: Request) {
    try {
        const { message, projectId } = await req.json();
        if (!message?.trim()) {
            return NextResponse.json({ reply: "Please ask me something!" });
        }

        // Gather lightweight context
        const [projects, recentIssues] = await Promise.all([
            prisma.pmProject.findMany({ take: 5, select: { name: true, key: true } }),
            prisma.pmIssue.findMany({
                where: {
                    ...(projectId ? { projectId } : {}),
                    deletedAt: null,
                    status: { in: ["BLOCKED", "IN_PROGRESS", "TODO"] },
                },
                take: 10,
                orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
                select: { key: true, title: true, status: true, priority: true, dueDate: true },
            }),
        ]);

        const blockedCount = recentIssues.filter(i => i.status === "BLOCKED").length;
        const urgentCount = recentIssues.filter(i => i.priority === "URGENT").length;
        const overdue = recentIssues.filter(i => i.dueDate && new Date(i.dueDate) < new Date()).length;

        const contextBlob = [
            `Projects: ${projects.map(p => `${p.key} (${p.name})`).join(", ")}`,
            `Active issues (top 10): ${recentIssues.map(i => `${i.key} [${i.status}/${i.priority}]${i.dueDate ? ` due ${new Date(i.dueDate).toLocaleDateString()}` : ""}: ${i.title}`).join(" | ")}`,
            `Summary: ${blockedCount} blockers, ${urgentCount} urgent, ${overdue} overdue.`,
        ].join("\n");

        const systemPrompt = `You are FRIDAY, an AI project management copilot. You have access to the following live project context:\n\n${contextBlob}\n\nAnswer the user's question concisely (2-4 sentences max). When listing items, use bullet points. If applicable, suggest a concrete action. Be direct and confident.`;

        const llm = getLLMProvider();
        const response = await llm.invoke([
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
        ] as any);

        const reply = typeof response.content === "string"
            ? response.content
            : "I analyzed the project context but couldn't generate a response right now.";

        return NextResponse.json({ reply });
    } catch (err: any) {
        console.error("[copilot] Error:", err.message);
        // Graceful fallback if LLM is unavailable
        return NextResponse.json({
            reply: "⚠️ AI copilot is currently unavailable (LLM not running). Start Ollama with `ollama serve` and pull `llama3` to enable it.",
        });
    }
}

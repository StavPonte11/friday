import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runFridayAgent } from "@/lib/ai/agent-runtime";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

export async function POST(req: Request) {
    try {
        const { message, projectId } = await req.json();
        if (!message?.trim()) {
            return NextResponse.json({ reply: "Please ask me something!" });
        }

        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        const project = await prisma.pmProject.findUnique({
            where: { id: projectId },
            select: { workspaceId: true },
        });

        if (!project) {
            return NextResponse.json({ reply: "Project not found." });
        }

        // We use a constant sessionId for now per project+user to maintain simple short-term memory
        const sessionId = `copilot-${projectId}-${userId || 'anon'}`;

        const result = await runFridayAgent(message, {
            projectId,
            workspaceId: project.workspaceId,
            sessionId,
            userId,
        });

        return NextResponse.json({ 
            reply: result.reply,
            toolsUsed: result.toolsUsed,
            ragContextUsed: result.ragContextUsed
        });
    } catch (err: any) {
        console.error("[copilot] Error:", err.message);
        // Graceful fallback if LLM is unavailable
        return NextResponse.json({
            reply: "⚠️ AI copilot is currently unavailable (LLM not running). Start Ollama with `ollama serve` and pull `llama3` to enable it.",
        });
    }
}

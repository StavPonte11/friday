import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { langfuse } from "@/lib/langfuse";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");

/**
 * AI-Powered PM automation endpoints.
 */
export const pmAiRouter = router({
    /**
     * Analyze the backlog and suggest stale/mis-prioritized issues to address.
     */
    groomBacklog: publicProcedure
        .input(z.object({
            projectId: z.string(),
            actorId: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            const start = Date.now();

            const issues = await prisma.pmIssue.findMany({
                where: { projectId: input.projectId, deletedAt: null, status: { notIn: ["DONE", "CANCELLED"] } } as any,
                select: {
                    id: true, key: true, title: true, status: true,
                    priority: true, storyPoints: true, updatedAt: true, dueDate: true,
                    assigneeId: true, sprintId: true,
                } as any,
                orderBy: { updatedAt: "asc" },
            });

            if (issues.length === 0) {
                return { suggestions: [], groomed: 0 };
            }

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const now = new Date();
            const issueList = (issues as any[]).map((i: any) => ({
                id: i.id,
                key: i.key,
                title: i.title,
                status: i.status,
                priority: i.priority,
                storyPoints: i.storyPoints,
                daysSinceUpdate: Math.floor((now.getTime() - new Date(i.updatedAt).getTime()) / 86400000),
                isOverdue: (i as any).dueDate ? new Date((i as any).dueDate as string) < now : false,
                unassigned: !i.assigneeId,
                inBacklog: !i.sprintId,
            }));

            const prompt = `You are an expert Agile coach doing backlog grooming. Analyze these ${issues.length} open issues and provide actionable suggestions.

Focus on:
- Stale issues (not updated in 14+ days) 
- Overdue issues missing urgency priority
- Unassigned high-priority issues
- Issues that should be closed or deprioritized

Issues:
${JSON.stringify(issueList, null, 2)}

Respond with a JSON array of suggestions (max 10), each containing:
{ "issueId": string, "issueKey": string, "suggestion": string, "action": "raise_priority"|"assign"|"close"|"move_to_sprint"|"deprioritize" }

Only JSON, no markdown.`;

            let suggestions: any[] = [];
            try {
                const result = await model.generateContent(prompt);
                const text = result.response.text().trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
                suggestions = JSON.parse(text);
            } catch (err) {
                console.error("[pmAi.groomBacklog] AI parse error:", err);
                suggestions = [];
            }

            langfuse.trace({
                name: "pm.ai.groomBacklog",
                userId: input.actorId,
                metadata: { projectId: input.projectId, issueCount: issues.length, latencyMs: Date.now() - start }
            });

            return { suggestions, groomed: suggestions.length };
        }),

    /**
     * Generate a manager-level sprint summary report.
     */
    generateManagerSummary: publicProcedure
        .input(z.object({
            projectId: z.string(),
            sprintId: z.string().optional(),
            actorId: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            const start = Date.now();

            const whereClause: any = { projectId: input.projectId, deletedAt: null };
            if (input.sprintId) whereClause.sprintId = input.sprintId;

            const [issues, sprint, members] = await Promise.all([
                prisma.pmIssue.findMany({
                    where: whereClause,
                    select: {
                        id: true, key: true, title: true, status: true,
                        priority: true, storyPoints: true, assigneeId: true, dueDate: true,
                    } as any,
                }),
                input.sprintId ? prisma.pmSprint.findUnique({ where: { id: input.sprintId } }) : null,
                prisma.pmProjectMember.findMany({
                    where: { projectId: input.projectId },
                    include: { user: { select: { id: true, name: true } } }
                }),
            ]);

            const done = (issues as any[]).filter((i: any) => i.status === "DONE").length;
            const inProgress = (issues as any[]).filter((i: any) => i.status === "IN_PROGRESS").length;
            const blocked = (issues as any[]).filter((i: any) => i.priority === "URGENT" && i.status !== "DONE").length;
            const totalPoints = (issues as any[]).reduce((sum, i: any) => sum + (i.storyPoints ?? 0), 0);
            const completedPoints = (issues as any[]).filter((i: any) => i.status === "DONE").reduce((sum, i: any) => sum + (i.storyPoints ?? 0), 0);

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `You are writing a concise manager-friendly sprint status report.

Sprint: ${sprint?.name ?? "Current Work"}
Team size: ${members.length}
Total issues: ${issues.length}
Done: ${done} | In Progress: ${inProgress} | Blocked/Urgent: ${blocked}
Velocity: ${completedPoints}/${totalPoints} points completed

Write a 3-4 paragraph executive summary in plain English covering:
1. What was accomplished
2. What's in progress  
3. Any risks or blockers
4. Recommended next focus areas

Keep it brief, data-driven, and professional. No bullet lists — use paragraphs.`;

            let summary = "";
            try {
                const result = await model.generateContent(prompt);
                summary = result.response.text();
            } catch (err) {
                console.error("[pmAi.generateManagerSummary] AI error:", err);
                summary = `Sprint Progress: ${done}/${issues.length} issues completed (${completedPoints}/${totalPoints} points). ${inProgress} items in progress, ${blocked} urgent/blocked. Team of ${members.length} active.`;
            }

            langfuse.trace({
                name: "pm.ai.managerSummary",
                userId: input.actorId,
                metadata: { projectId: input.projectId, sprintId: input.sprintId, latencyMs: Date.now() - start }
            });

            return {
                summary,
                stats: { total: issues.length, done, inProgress, blocked, totalPoints, completedPoints },
                sprintName: sprint?.name ?? "Current Work",
            };
        }),
});

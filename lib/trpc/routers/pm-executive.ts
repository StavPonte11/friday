import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { langfuse } from "@/lib/langfuse";
import { getLLMProvider } from "@/lib/ai/provider";

// ─── Executive Dashboard Router ───────────────────────────────────────────────
// Provides a high-level, read-only view for leadership with shareable tokens.

export const pmExecutiveRouter = router({
    /** Full metrics snapshot for a workspace */
    metrics: publicProcedure
        .input(z.object({ workspaceId: z.string() }))
        .query(async ({ input }) => {
            const [
                projects,
                issuesByStatus,
                issuesByPriority,
                overdue,
                blockers,
                recentActivity,
            ] = await Promise.all([
                prisma.pmProject.findMany({
                    where: { workspaceId: input.workspaceId, deletedAt: null },
                    include: {
                        sprints: {
                            where: { status: "ACTIVE" },
                            take: 1,
                            include: { issues: { select: { status: true, storyPoints: true } } }
                        },
                        _count: {
                            select: { issues: true, members: true }
                        }
                    }
                }),
                prisma.pmIssue.groupBy({
                    by: ["status"],
                    where: { workspaceId: input.workspaceId, deletedAt: null },
                    _count: { _all: true },
                }),
                prisma.pmIssue.groupBy({
                    by: ["priority"],
                    where: { workspaceId: input.workspaceId, deletedAt: null },
                    _count: { _all: true },
                }),
                prisma.pmIssue.count({
                    where: {
                        workspaceId: input.workspaceId,
                        deletedAt: null,
                        dueDate: { lt: new Date() },
                        status: { not: "DONE" },
                    }
                }),
                prisma.pmIssue.count({
                    where: {
                        workspaceId: input.workspaceId,
                        deletedAt: null,
                        status: "BLOCKED",
                    }
                }),
                prisma.pmIssueActivity.findMany({
                    where: {
                        issue: { workspaceId: input.workspaceId }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                    include: {
                        actor: { select: { id: true, name: true, image: true } },
                        issue: { select: { id: true, key: true, title: true } },
                    }
                }),
            ]);

            // Sprint health per project
            const sprintHealth = projects.map(p => {
                const sprint = p.sprints[0];
                if (!sprint) return { projectId: p.id, name: p.name, sprintName: null, done: 0, total: 0, pct: 0 };
                const total = sprint.issues.length;
                const done = sprint.issues.filter(i => i.status === "DONE").length;
                return {
                    projectId: p.id,
                    name: p.name,
                    sprintName: sprint.name,
                    done,
                    total,
                    pct: total > 0 ? Math.round((done / total) * 100) : 0,
                };
            });

            return {
                projects: projects.map(p => ({
                    id: p.id,
                    name: p.name,
                    key: p.key,
                    issueCount: p._count.issues,
                    memberCount: p._count.members,
                })),
                issuesByStatus,
                issuesByPriority,
                overdue,
                blockers,
                sprintHealth,
                recentActivity,
                generatedAt: new Date().toISOString(),
            };
        }),

    /** AI-generated executive summary (text) */
    aiSummary: publicProcedure
        .input(z.object({ workspaceId: z.string() }))
        .mutation(async ({ input }) => {
            const start = Date.now();
            try {
                const [projects, overdue, blockers] = await Promise.all([
                    prisma.pmProject.count({ where: { workspaceId: input.workspaceId, deletedAt: null } }),
                    prisma.pmIssue.count({ where: { workspaceId: input.workspaceId, deletedAt: null, dueDate: { lt: new Date() }, status: { not: "DONE" } } }),
                    prisma.pmIssue.count({ where: { workspaceId: input.workspaceId, deletedAt: null, status: "BLOCKED" } }),
                ]);

                const prompt = `You are an engineering executive assistant. Generate a concise 3-paragraph executive summary for our engineering org:
- ${projects} active projects
- ${overdue} overdue items
- ${blockers} blocked items
Focus on: delivery health, risks, and recommended actions. Be direct and actionable.`;

                const llm = getLLMProvider();
                const res = await llm.invoke([{ role: "user", content: prompt }] as any);
                const summary = typeof res.content === "string" ? res.content : "Summary unavailable.";

                langfuse.trace({
                    name: "pm.executive.ai_summary",
                    metadata: { workspaceId: input.workspaceId, latencyMs: Date.now() - start }
                });

                return { summary };
            } catch {
                return { summary: "⚠️ AI summary unavailable. Ensure your LLM provider is running." };
            }
        }),

    /** Create a shareable read-only token for the executive dashboard */
    createShareToken: publicProcedure
        .input(z.object({
            workspaceId: z.string(),
            projectId: z.string().optional(),
            createdById: z.string().optional(),
            expiresInDays: z.number().int().min(1).max(365).default(30),
        }))
        .mutation(async ({ input }) => {
            const token = randomBytes(24).toString("hex");
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

            const share = await prisma.pmShareToken.create({
                data: {
                    token,
                    workspaceId: input.workspaceId,
                    projectId: input.projectId,
                    createdById: input.createdById,
                    expiresAt,
                }
            });

            return {
                token: share.token,
                shareUrl: `/api/pm/dashboard/share/${share.token}`,
                expiresAt: share.expiresAt,
            };
        }),

    /** Validate and resolve a share token */
    resolveShareToken: publicProcedure
        .input(z.object({ token: z.string() }))
        .query(async ({ input }) => {
            const record = await prisma.pmShareToken.findUnique({ where: { token: input.token } });
            if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid share token" });
            if (record.expiresAt && record.expiresAt < new Date()) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Share token has expired" });
            }

            // Increment view count
            await prisma.pmShareToken.update({
                where: { id: record.id },
                data: { viewCount: { increment: 1 } }
            });

            return { workspaceId: record.workspaceId, projectId: record.projectId };
        }),
});

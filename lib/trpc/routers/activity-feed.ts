import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/analytics";

export const activityFeedRouter = router({
    /**
     * Fetches paginated activity across audit logs, comments, and issue status changes
     * for a given project. Acts as the unified feed source for real-time updates.
     */
    getProjectFeed: protectedProcedure
        .input(z.object({
            projectId: z.string(),
            cursor: z.string().optional(),
            limit: z.number().int().min(1).max(50).default(25)
        }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            // Fetch audit logs for project-related actions
            const logs = await prisma.auditLog.findMany({
                where: {
                    OR: [
                        { entityType: "PmIssue", details: { path: ["projectId"], equals: input.projectId } },
                        { entityType: "PmProject", entityId: input.projectId },
                        { entityType: "PmComment", details: { path: ["projectId"], equals: input.projectId } },
                    ]
                },
                orderBy: { createdAt: "desc" },
                take: input.limit,
                ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
                include: {
                    user: { select: { id: true, name: true, image: true } }
                }
            });

            // Fetch recent status history transitions
            const statusHistory = await prisma.pmIssueStatusHistory.findMany({
                where: { issue: { projectId: input.projectId } },
                orderBy: { createdAt: "desc" },
                take: input.limit,
                include: {
                    issue: { select: { id: true, key: true, title: true } },
                    user: { select: { id: true, name: true, image: true } }
                }
            });

            // Normalise into a unified feed format
            type FeedItem = {
                id: string;
                type: "audit" | "status_change" | "comment";
                actor: { id: string; name: string | null; image: string | null } | null;
                description: string;
                entityId: string;
                entityType: string;
                createdAt: Date;
            };

            const auditItems: FeedItem[] = logs.map(log => ({
                id: `audit-${log.id}`,
                type: "audit",
                actor: log.user,
                description: `${log.action} ${log.entityType.replace("Pm", "")} ${(log.entityId ?? "").slice(0, 8)}`,
                entityId: log.entityId ?? "",
                entityType: log.entityType,
                createdAt: log.createdAt
            }));

            const statusItems: FeedItem[] = statusHistory.map(h => ({
                id: `status-${h.id}`,
                type: "status_change",
                actor: h.user,
                description: `moved ${h.issue.key} → ${h.status.replace("_", " ")}`,
                entityId: h.issueId,
                entityType: "PmIssue",
                createdAt: h.createdAt
            }));

            // Merge and sort
            const feed = [...auditItems, ...statusItems]
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, input.limit);

            const nextCursor = logs.length === input.limit ? logs[logs.length - 1]?.id : undefined;

            await trackEvent("pm.issue.view", { userId, projectId: input.projectId });

            return { feed, nextCursor };
        })
});

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { searchMemory } from "@/lib/ai/memory";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/analytics";

export const pmSearchRouter = router({
    semanticSearch: protectedProcedure
        .input(z.object({
            query: z.string().min(1).max(500),
            projectId: z.string().optional(),
            limit: z.number().int().min(1).max(25).default(10)
        }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            // Find similar issue embeddings
            const similar = await searchMemory(input.query, input.limit);

            if (similar.length === 0) return { results: [] };

            const issueIds = similar.map(s => s.issueId);

            // Hydrate with full issue data
            const issues = await prisma.pmIssue.findMany({
                where: {
                    id: { in: issueIds },
                    ...(input.projectId ? { projectId: input.projectId } : {})
                },
                select: {
                    id: true,
                    key: true,
                    title: true,
                    status: true,
                    priority: true,
                    project: { select: { id: true, name: true, key: true } },
                    assignee: { select: { id: true, name: true, image: true } }
                }
            });

            // Merge similarity score back in, maintain rank order
            const hydrated = issueIds
                .map(id => {
                    const issue = issues.find(i => i.id === id);
                    const similarity = similar.find(s => s.issueId === id)?.similarity ?? 0;
                    if (!issue) return null;
                    return { ...issue, similarity };
                })
                .filter((r): r is NonNullable<typeof r> => r !== null);

            await trackEvent("pm.issue.view", { userId, query: input.query });

            return { results: hydrated };
        })
});

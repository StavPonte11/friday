import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";

// ─── Token-aware structured query parser ──────────────────────────────────────
// Supports: assignee:me status:open label:backend priority:high
// Remaining words treated as full-text search across title/key

interface ParsedQuery {
    text: string;
    assigneeHandle?: string;
    statusIn?: string[];
    labelNames?: string[];
    priority?: string;
    type?: string;
}

function parseQuery(raw: string): ParsedQuery {
    const tokens = raw.trim().split(/\s+/);
    const result: ParsedQuery = { text: "" };
    const textParts: string[] = [];

    for (const token of tokens) {
        if (!token.includes(":")) {
            textParts.push(token);
            continue;
        }
        const [key, ...rest] = token.split(":");
        const val = rest.join(":").toLowerCase();

        switch (key.toLowerCase()) {
            case "assignee": result.assigneeHandle = val; break;
            case "status": result.statusIn = val.split(","); break;
            case "label": result.labelNames = val.split(","); break;
            case "priority": result.priority = val.toUpperCase(); break;
            case "type": result.type = val.toUpperCase(); break;
            default: textParts.push(token);
        }
    }

    result.text = textParts.join(" ");
    return result;
}

export const pmSearchRouter = router({
    /**
     * Structured search supporting:
     *   "assignee:me status:open label:backend critical bug"
     */
    search: publicProcedure
        .input(z.object({
            query: z.string().min(1),
            projectId: z.string().optional(),
            workspaceId: z.string().optional(),
            limit: z.number().int().min(1).max(50).default(20),
            currentUserId: z.string().optional(),
        }))
        .query(async ({ input }) => {
            const parsed = parseQuery(input.query);

            // Resolve assignee:me → userId
            let assigneeId: string | undefined;
            if (parsed.assigneeHandle) {
                if (parsed.assigneeHandle === "me" && input.currentUserId) {
                    assigneeId = input.currentUserId;
                } else {
                    const u = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { name: { contains: parsed.assigneeHandle, mode: "insensitive" } },
                                { email: { startsWith: parsed.assigneeHandle, mode: "insensitive" } },
                            ]
                        },
                        select: { id: true },
                    });
                    assigneeId = u?.id;
                }
            }

            // Resolve label names → ids
            let labelIds: string[] | undefined;
            if (parsed.labelNames?.length) {
                const labels = await prisma.pmLabel.findMany({
                    where: { name: { in: parsed.labelNames, mode: "insensitive" } as any },
                    select: { id: true },
                });
                labelIds = labels.map(l => l.id);
            }

            const where: any = {
                deletedAt: null,
                ...(input.projectId ? { projectId: input.projectId } : {}),
                ...(assigneeId ? { assigneeId } : {}),
                ...(parsed.statusIn ? { status: { in: parsed.statusIn } } : {}),
                ...(parsed.priority ? { priority: parsed.priority } : {}),
                ...(parsed.type ? { type: parsed.type } : {}),
                ...(labelIds?.length ? { labels: { some: { id: { in: labelIds } } } } : {}),
            };

            if (parsed.text.length >= 1) {
                where.OR = [
                    { title: { contains: parsed.text, mode: "insensitive" } },
                    { key: { contains: parsed.text, mode: "insensitive" } },
                    { description: { contains: parsed.text, mode: "insensitive" } },
                ];
            }

            return prisma.pmIssue.findMany({
                where,
                take: input.limit,
                orderBy: [{ updatedAt: "desc" }],
                select: {
                    id: true,
                    key: true,
                    title: true,
                    status: true,
                    priority: true,
                    type: true,
                    projectId: true,
                    assignee: { select: { id: true, name: true, image: true } },
                },
            });
        }),

    /**
     * Original global search (issues + projects by text only).
     * Kept for CMD+K palette.
     */
    global: publicProcedure
        .input(z.object({
            query: z.string().min(2),
            limit: z.number().int().min(1).default(5),
            userId: z.string().optional(),
        }))
        .query(async ({ input }) => {
            const [issues, projects] = await Promise.all([
                prisma.pmIssue.findMany({
                    where: {
                        deletedAt: null,
                        OR: [
                            { title: { contains: input.query, mode: "insensitive" } },
                            { key: { contains: input.query, mode: "insensitive" } },
                            { description: { contains: input.query, mode: "insensitive" } },
                        ],
                    },
                    take: input.limit,
                    select: { id: true, key: true, title: true, status: true, projectId: true },
                }),
                prisma.pmProject.findMany({
                    where: {
                        OR: [
                            { name: { contains: input.query, mode: "insensitive" } },
                            { key: { contains: input.query, mode: "insensitive" } },
                        ],
                    },
                    take: input.limit,
                    select: { id: true, key: true, name: true },
                }),
            ]);

            return { issues, projects };
        }),

    recent: publicProcedure
        .input(z.object({ userId: z.string(), limit: z.number().int().default(5) }))
        .query(async ({ input }) => {
            const recentViews = await prisma.pmRecentView.findMany({
                where: { userId: input.userId },
                orderBy: { viewedAt: "desc" },
                take: input.limit,
            });

            const issueIds = recentViews.filter(r => r.entityType === "issue").map(r => r.entityId);
            const projectIds = recentViews.filter(r => r.entityType === "project").map(r => r.entityId);

            const [issues, projects] = await Promise.all([
                issueIds.length > 0
                    ? prisma.pmIssue.findMany({
                        where: { id: { in: issueIds }, deletedAt: null },
                        select: { id: true, key: true, title: true, status: true },
                    })
                    : [],
                projectIds.length > 0
                    ? prisma.pmProject.findMany({
                        where: { id: { in: projectIds } },
                        select: { id: true, key: true, name: true },
                    })
                    : [],
            ]);

            return { issues, projects, orderedRaw: recentViews };
        }),

    mentionUsers: publicProcedure
        .input(z.object({ query: z.string(), limit: z.number().int().default(6) }))
        .query(async ({ input }) => {
            if (input.query.trim().length < 1) {
                return prisma.user.findMany({
                    take: input.limit,
                    select: { id: true, name: true, email: true, image: true },
                });
            }
            return prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: input.query, mode: "insensitive" } },
                        { email: { contains: input.query, mode: "insensitive" } },
                    ],
                },
                take: input.limit,
                select: { id: true, name: true, email: true, image: true },
            });
        }),
});

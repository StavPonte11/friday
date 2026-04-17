import { z } from "zod";
import { router, memberProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { IssueRelationType } from "@prisma/client";

export const pmGraphRouter = router({
    addRelation: memberProcedure
        .input(z.object({
            workspaceId: z.string(),
            fromIssueId: z.string(),
            toIssueId: z.string(),
            type: z.nativeEnum(IssueRelationType)
        }))
        .mutation(async ({ input }) => {
            if (input.fromIssueId === input.toIssueId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot relate an issue to itself." });
            }
            
            // Check issues belong to valid workspace scope
            const issues = await prisma.pmIssue.findMany({
                where: {
                    id: { in: [input.fromIssueId, input.toIssueId] },
                    project: { workspaceId: input.workspaceId }
                }
            });

            if (issues.length !== 2) {
                throw new TRPCError({ code: "NOT_FOUND", message: "One or both issues not found in this workspace." });
            }

            return prisma.issueRelation.upsert({
                where: {
                    fromIssueId_toIssueId_type: {
                        fromIssueId: input.fromIssueId,
                        toIssueId: input.toIssueId,
                        type: input.type
                    }
                },
                update: {},
                create: {
                    fromIssueId: input.fromIssueId,
                    toIssueId: input.toIssueId,
                    type: input.type
                }
            });
        }),

    removeRelation: memberProcedure
        .input(z.object({
            workspaceId: z.string(),
            relationId: z.string()
        }))
        .mutation(async ({ input }) => {
            const relation = await prisma.issueRelation.findUnique({
                where: { id: input.relationId },
                include: { fromIssue: { include: { project: true } } }
            });

            if (!relation || relation.fromIssue.project.workspaceId !== input.workspaceId) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }

            return prisma.issueRelation.delete({ where: { id: input.relationId } });
        }),

    getIssueGraph: memberProcedure
        .input(z.object({
            workspaceId: z.string(),
            projectId: z.string().optional()
        }))
        .query(async ({ input }) => {
            // Load nodes (issues)
            const nodes = await prisma.pmIssue.findMany({
                where: {
                    project: {
                        workspaceId: input.workspaceId,
                        ...(input.projectId ? { id: input.projectId } : {})
                    }
                },
                select: {
                    id: true,
                    key: true,
                    title: true,
                    status: true,
                    assignee: { select: { name: true, image: true }}
                }
            });

            // Load edges (relations)
            const nodeIds = nodes.map(n => n.id);
            const edges = await prisma.issueRelation.findMany({
                where: {
                    fromIssueId: { in: nodeIds },
                    toIssueId: { in: nodeIds }
                }
            });

            return { nodes, edges };
        }),

    detectBottlenecks: memberProcedure
        .input(z.object({ workspaceId: z.string(), projectId: z.string() }))
        .query(async ({ input }) => {
            // A bottleneck is an issue that BLOCKS many other issues
            const bottlenecks = await prisma.issueRelation.groupBy({
                by: ['fromIssueId'],
                where: {
                    type: 'BLOCKS',
                    toIssue: { project: { workspaceId: input.workspaceId, id: input.projectId }}
                },
                _count: { toIssueId: true },
                orderBy: { _count: { toIssueId: 'desc' } },
                take: 5
            });

            const issueIds = bottlenecks.map(b => b.fromIssueId);
            const issues = await prisma.pmIssue.findMany({
                where: { id: { in: issueIds } },
                select: { id: true, key: true, title: true, status: true }
            });

            return bottlenecks.map(b => ({
                issue: issues.find(i => i.id === b.fromIssueId)!,
                blockedCount: b._count.toIssueId
            }));
        })
});

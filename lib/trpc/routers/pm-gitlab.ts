import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import {
    getGitLabIssue,
    createGitLabIssue,
    closeGitLabIssue,
    reopenGitLabIssue,
    isGitLabConfigured,
} from "@/lib/integrations/gitlab";

export const pmGitLabRouter = router({
    /**
     * Check if GitLab integration is configured.
     */
    isConfigured: publicProcedure.query(() => isGitLabConfigured()),

    /**
     * List all GitLab links for an issue.
     */
    listLinks: publicProcedure
        .input(z.object({ issueId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmGitLabLink.findMany({ where: { issueId: input.issueId } });
        }),

    /**
     * Link a FRIDAY issue to an existing GitLab issue.
     */
    linkIssue: publicProcedure
        .input(z.object({
            issueId: z.string(),
            gitlabProjectId: z.number().int().positive(),
            gitlabIssueIid: z.number().int().positive(),
        }))
        .mutation(async ({ input }) => {
            if (!isGitLabConfigured()) throw new Error("GitLab integration not configured");

            const gl = await getGitLabIssue(input.gitlabProjectId, input.gitlabIssueIid);

            return prisma.pmGitLabLink.upsert({
                where: {
                    issueId_gitlabProjectId_gitlabIssueId: {
                        issueId: input.issueId,
                        gitlabProjectId: input.gitlabProjectId,
                        gitlabIssueId: input.gitlabIssueIid,
                    }
                },
                create: {
                    issueId: input.issueId,
                    gitlabProjectId: input.gitlabProjectId,
                    gitlabIssueId: input.gitlabIssueIid,
                    gitlabUrl: gl.web_url,
                    synced: true,
                },
                update: { gitlabUrl: gl.web_url, synced: true }
            });
        }),

    /**
     * Create a new GitLab issue from a FRIDAY issue and link them.
     */
    createGitLabIssue: publicProcedure
        .input(z.object({
            issueId: z.string(),
            gitlabProjectId: z.number().int().positive(),
        }))
        .mutation(async ({ input }) => {
            if (!isGitLabConfigured()) throw new Error("GitLab integration not configured");

            const issue = await prisma.pmIssue.findUnique({
                where: { id: input.issueId },
                include: { labels: true }
            });
            if (!issue) throw new Error("Issue not found");

            const glIssue = await createGitLabIssue(
                input.gitlabProjectId,
                `[${issue.key}] ${issue.title}`,
                issue.description ?? undefined,
                issue.labels.map(l => l.name)
            );

            return prisma.pmGitLabLink.create({
                data: {
                    issueId: input.issueId,
                    gitlabProjectId: input.gitlabProjectId,
                    gitlabIssueId: glIssue.iid,
                    gitlabUrl: glIssue.web_url,
                    synced: true,
                }
            });
        }),

    /**
     * Sync FRIDAY issue status with GitLab.
     * If FRIDAY issue is DONE, close the GitLab issue. Otherwise reopen it.
     */
    syncStatus: publicProcedure
        .input(z.object({ issueId: z.string() }))
        .mutation(async ({ input }) => {
            if (!isGitLabConfigured()) throw new Error("GitLab integration not configured");

            const issue = await prisma.pmIssue.findUnique({ where: { id: input.issueId } });
            if (!issue) throw new Error("Issue not found");

            const links = await prisma.pmGitLabLink.findMany({ where: { issueId: input.issueId } });
            if (links.length === 0) throw new Error("No GitLab links found for this issue");

            const results = await Promise.all(links.map(async (link) => {
                if (issue.status === "DONE") {
                    await closeGitLabIssue(link.gitlabProjectId, link.gitlabIssueId);
                } else {
                    await reopenGitLabIssue(link.gitlabProjectId, link.gitlabIssueId);
                }
                await prisma.pmGitLabLink.update({ where: { id: link.id }, data: { synced: true } });
                return link;
            }));

            return results;
        }),

    /**
     * Remove a GitLab link.
     */
    unlink: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            await prisma.pmGitLabLink.delete({ where: { id: input.id } });
            return { success: true };
        }),
});

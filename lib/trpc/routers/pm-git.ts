/**
 * tRPC Git Router
 * List, manually link, and unlink PR/MR ↔ Issue connections.
 * Auto-linking is handled by the GitHub/GitLab webhook routes.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { GitPrStatus } from "@prisma/client";
import { traceIntegrationEvent } from "@/lib/integrations/analytics";

const ISSUE_KEY_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/g;
const HASH_REF_RE = /#(\d+)/g;

export const pmGitRouter = router({
  /** List all PR/MR links for an issue */
  listLinks: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ input }) => {
      return prisma.pmGitLink.findMany({
        where: { issueId: input.issueId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Manually link a PR/MR URL to an issue */
  manualLink: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        provider: z.enum(["github", "gitlab"]),
        repoName: z.string().min(1), // e.g. "org/repo"
        prNumber: z.number().int().positive(),
        prTitle: z.string().optional(),
        prUrl: z.string().url(),
        branch: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const issue = await prisma.pmIssue.findUnique({ where: { id: input.issueId } });
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });

      const link = await prisma.pmGitLink.upsert({
        where: {
          issueId_provider_repoName_prNumber: {
            issueId: input.issueId,
            provider: input.provider,
            repoName: input.repoName,
            prNumber: input.prNumber,
          },
        },
        create: {
          issueId: input.issueId,
          provider: input.provider,
          repoName: input.repoName,
          prNumber: input.prNumber,
          prTitle: input.prTitle,
          prUrl: input.prUrl,
          branch: input.branch,
          status: GitPrStatus.OPEN,
        },
        update: {
          prTitle: input.prTitle,
          prUrl: input.prUrl,
          branch: input.branch,
        },
      });

      traceIntegrationEvent("integration.synced", {
        userId: ctx.session.user.id,
        provider: input.provider,
        type: "git",
        metadata: { action: "manualLink", issueId: input.issueId, prNumber: input.prNumber },
      });

      return link;
    }),

  /** Unlink a PR/MR from an issue */
  unlinkPR: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const link = await prisma.pmGitLink.findUnique({ where: { id: input.linkId } });
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Git link not found" });

      await prisma.pmGitLink.delete({ where: { id: input.linkId } });

      traceIntegrationEvent("integration.synced", {
        userId: ctx.session.user.id,
        provider: link.provider,
        type: "git",
        metadata: { action: "unlinked", linkId: input.linkId },
      });

      return { success: true };
    }),

  /** Extract issue keys from a PR title+body — returns matching issues */
  parseIssueKeys: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        projectKey: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const fromKey = [...input.text.matchAll(ISSUE_KEY_RE)].map((m) => m[1]);
      const fromHash = input.projectKey
        ? [...input.text.matchAll(HASH_REF_RE)].map((m) => `${input.projectKey}-${m[1]}`)
        : [];

      const allKeys = [...new Set([...fromKey, ...fromHash])];
      if (allKeys.length === 0) return [];

      return prisma.pmIssue.findMany({
        where: { key: { in: allKeys } },
        select: { id: true, key: true, title: true, status: true },
      });
    }),

  /** Get the user's connected git provider(s) */
  getConnectedProviders: protectedProcedure.query(async ({ ctx }) => {
    return prisma.integration.findMany({
      where: { userId: ctx.session.user.id, type: "git" },
      select: { id: true, provider: true, metadata: true, createdAt: true },
    });
  }),
});

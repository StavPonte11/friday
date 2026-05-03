/**
 * tRPC Design Router (Figma)
 * Attach, list, and remove Figma design links on issues.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { parseFigmaUrl, getFigmaFileInfo } from "@/lib/integrations/figma/client";
import { traceIntegrationEvent } from "@/lib/integrations/analytics";

export const pmDesignRouter = router({
  /** List all design links for an issue */
  listLinks: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ input }) => {
      return prisma.issueDesignLink.findMany({
        where: { issueId: input.issueId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Attach a Figma link to an issue */
  attachDesign: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        url: z.string().url(),
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const issue = await prisma.pmIssue.findUnique({ where: { id: input.issueId } });
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });

      const parsed = parseFigmaUrl(input.url);
      if (!parsed.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Figma URL. Expected: https://www.figma.com/file/... or /design/...",
        });
      }

      // Attempt to fetch title from Figma API if not provided
      let title = input.title;
      if (!title) {
        try {
          const info = await getFigmaFileInfo(parsed.fileId, ctx.session.user.id);
          title = info?.name;
        } catch {
          // Non-fatal — user may not have a Figma token
        }
      }

      const link = await prisma.issueDesignLink.upsert({
        where: {
          issueId_fileId_nodeId: {
            issueId: input.issueId,
            fileId: parsed.fileId,
            nodeId: parsed.nodeId ?? null,
          },
        },
        create: {
          issueId: input.issueId,
          provider: "figma",
          fileId: parsed.fileId,
          nodeId: parsed.nodeId,
          url: input.url,
          title,
        },
        update: { url: input.url, title },
      });

      traceIntegrationEvent("integration.synced", {
        userId: ctx.session.user.id,
        provider: "figma",
        type: "design",
        metadata: { action: "attached", issueId: input.issueId, fileId: parsed.fileId },
      });

      return link;
    }),

  /** Remove a design link */
  removeDesign: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const link = await prisma.issueDesignLink.findUnique({ where: { id: input.linkId } });
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Design link not found" });

      await prisma.issueDesignLink.delete({ where: { id: input.linkId } });

      traceIntegrationEvent("integration.synced", {
        userId: ctx.session.user.id,
        provider: "figma",
        type: "design",
        metadata: { action: "removed", linkId: input.linkId },
      });

      return { success: true };
    }),

  /** Refresh metadata (title, thumbnail) for a design link */
  refreshMeta: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const link = await prisma.issueDesignLink.findUnique({ where: { id: input.linkId } });
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Design link not found" });

      const info = await getFigmaFileInfo(link.fileId, ctx.session.user.id);
      if (!info) {
        return { updated: false, reason: "no_access" };
      }

      await prisma.issueDesignLink.update({
        where: { id: input.linkId },
        data: { title: info.name },
      });

      return { updated: true, title: info.name };
    }),
});

/**
 * tRPC Calendar Router
 * Endpoints for scheduling meetings from issues, listing calendar links,
 * and unlinking events from issues.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { queueService, QUEUES } from "@/workers/shared/queues";
import { traceIntegrationEvent } from "@/lib/integrations/analytics";

export const pmCalendarRouter = router({
  /** List calendar links for an issue */
  listLinks: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ input }) => {
      return prisma.issueCalendarLink.findMany({
        where: { issueId: input.issueId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Schedule a calendar event from an issue (creates link via worker) */
  scheduleMeeting: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        title: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const issue = await prisma.pmIssue.findUnique({ where: { id: input.issueId } });
      if (!issue) throw new TRPCError({ code: "NOT_FOUND", message: "Issue not found" });

      const integration = await prisma.integration.findFirst({
        where: { userId, type: "calendar" },
      });
      if (!integration) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No calendar integration connected. Visit Settings → Integrations.",
        });
      }

      // Update issue dates then enqueue push sync
      await prisma.pmIssue.update({
        where: { id: input.issueId },
        data: {
          startDate: new Date(input.startDate),
          dueDate: new Date(input.endDate),
          title: input.title ?? issue.title,
        },
      });

      await queueService.connect();
      await queueService.publish(QUEUES.CALENDAR_SYNC, {
        action: "push",
        issueId: input.issueId,
        userId,
      });

      traceIntegrationEvent("integration.synced", {
        userId,
        provider: integration.provider,
        type: "calendar",
        direction: "push",
        metadata: { issueId: input.issueId, action: "scheduleMeeting" },
      });

      return { success: true };
    }),

  /** Manually trigger a push sync for an issue's dueDate */
  syncIssue: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      await queueService.connect();
      await queueService.publish(QUEUES.CALENDAR_SYNC, {
        action: "push",
        issueId: input.issueId,
        userId,
      });

      return { queued: true };
    }),

  /** Unlink a calendar event from an issue (does NOT delete the event) */
  unlinkEvent: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const link = await prisma.issueCalendarLink.findUnique({ where: { id: input.linkId } });
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Calendar link not found" });

      await prisma.issueCalendarLink.delete({ where: { id: input.linkId } });

      traceIntegrationEvent("integration.synced", {
        userId: ctx.session.user.id,
        provider: link.provider,
        type: "calendar",
        metadata: { action: "unlinked", linkId: input.linkId },
      });

      return { success: true };
    }),

  /** Get the user's connected calendar provider */
  getConnectedProvider: protectedProcedure.query(async ({ ctx }) => {
    const integration = await prisma.integration.findFirst({
      where: { userId: ctx.session.user.id, type: "calendar" },
      select: { id: true, provider: true, createdAt: true },
    });
    return integration;
  }),
});

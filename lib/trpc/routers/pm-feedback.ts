/**
 * Feedback tRPC router.
 *
 * Allows any user to submit in-app feedback and admins to query all feedback.
 */

import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "../../analytics";

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------
const FeedbackTypeSchema = z.enum(["bug", "feature", "ux", "other"]);

const SubmitFeedbackInput = z.object({
  type: FeedbackTypeSchema,
  message: z.string().min(1, "Message is required").max(2000),
  userId: z.string().optional(),
  page: z.string().optional(),
  projectId: z.string().optional(),
  issueId: z.string().optional(),
});

const ListFeedbackInput = z.object({
  type: FeedbackTypeSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(["newest", "oldest"]).default("newest"),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export const pmFeedbackRouter = router({
  /**
   * Submit a new feedback entry from any page.
   */
  submit: publicProcedure
    .input(SubmitFeedbackInput)
    .mutation(async ({ input }) => {
      const feedback = await prisma.appFeedback.create({
        data: {
          userId: input.userId ?? null,
          type: input.type,
          message: input.message,
          page: input.page ?? null,
          projectId: input.projectId ?? null,
          issueId: input.issueId ?? null,
        },
      });

      await trackEvent("pm.feedback.submit", {
        ...(input.userId ? { userId: input.userId } : {}),
        type: input.type,
        page: input.page ?? "unknown",
      } as any);

      return feedback;
    }),

  /**
   * List all feedback — admin only (no auth guard for MVP, add in Phase 2).
   */
  list: publicProcedure
    .input(ListFeedbackInput)
    .query(async ({ input }) => {
      const where = input.type ? { type: input.type } : {};
      const [items, total] = await Promise.all([
        prisma.appFeedback.findMany({
          where,
          orderBy: {
            createdAt: input.sortBy === "newest" ? "desc" : "asc",
          },
          take: input.limit,
          skip: input.offset,
        }),
        prisma.appFeedback.count({ where }),
      ]);

      return { items, total };
    }),

  /**
   * Count feedback by type for the dashboard summary.
   */
  countByType: publicProcedure.query(async () => {
    const all = await prisma.appFeedback.findMany({
      select: { type: true },
    });

    const counts: Record<string, number> = {
      bug: 0,
      feature: 0,
      ux: 0,
      other: 0,
    };

    for (const f of all) {
      counts[f.type] = (counts[f.type] ?? 0) + 1;
    }

    return counts;
  }),
});

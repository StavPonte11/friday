import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "../../analytics";
import { auditLog } from "@/lib/audit";

function extractMentions(text: string) {
    const mentions = text.match(/@(\w+)/g) || [];
    return mentions.map(m => m.slice(1));
}

export const pmCommentsRouter = router({
  list: publicProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ input }) => {
      // Get all top level comments + replies
      return prisma.pmComment.findMany({
        where: { issueId: input.issueId, parentId: null },
        include: {
          author: { select: { id: true, name: true, image: true } },
          reactions: { include: { user: { select: { id: true, name: true } } } },
          replies: {
              include: {
                  author: { select: { id: true, name: true, image: true } },
                  reactions: { include: { user: { select: { id: true, name: true } } } }
              },
              orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'asc' }
        ]
      });
    }),

  create: protectedProcedure
    .input(z.object({
        issueId: z.string(),
        content: z.string().min(1),
        parentId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const comment = await prisma.pmComment.create({
          data: {
              issueId: input.issueId,
              content: input.content,
              authorId: userId,
              parentId: input.parentId ?? null
          },
          include: { issue: { include: { project: true } } }
      });
      
      const mentionedUsernames = extractMentions(input.content);
      
      await auditLog({
          workspaceId: comment.issue.project.workspaceId,
          userId,
          action: "pm_comment.created",
          entityType: "PmComment",
          entityId: comment.id,
          details: { issueId: input.issueId, hasMention: mentionedUsernames.length > 0 }
      });
      
      await trackEvent("pm.comment.add", { 
          userId, 
          issueId: input.issueId, 
          hasMention: mentionedUsernames.length > 0 
      });
      return comment;
    }),

  react: protectedProcedure
    .input(z.object({ commentId: z.string(), emoji: z.string() }))
    .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const existing = await prisma.pmReaction.findUnique({
            where: { commentId_userId_emoji: { commentId: input.commentId, userId, emoji: input.emoji } }
        });
        
        if (existing) {
            await prisma.pmReaction.delete({ where: { id: existing.id } });
            return { action: 'removed' };
        } else {
            await prisma.pmReaction.create({
                data: { commentId: input.commentId, userId, emoji: input.emoji }
            });
            await trackEvent("pm.comment.react", { userId, commentId: input.commentId });
            return { action: 'added' };
        }
    }),

  pin: protectedProcedure
    .input(z.object({ commentId: z.string(), isPinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
        const comment = await prisma.pmComment.update({
            where: { id: input.commentId },
            data: { isPinned: input.isPinned },
            include: { issue: { include: { project: true } } }
        });
        
        await auditLog({
            workspaceId: comment.issue.project.workspaceId,
            userId: ctx.session.user.id,
            action: input.isPinned ? "pm_comment.pinned" : "pm_comment.unpinned",
            entityType: "PmComment",
            entityId: comment.id,
            details: { issueId: comment.issueId }
        });
        
        return comment;
    })
});

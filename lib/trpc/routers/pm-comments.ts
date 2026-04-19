import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import {
    notify,
    notifyMany,
    extractMentions,
    resolveMentions
} from "@/lib/pm/notification-service";

export const pmCommentsRouter = router({
    /**
     * List comments for an issue (with threaded replies nested).
     */
    list: publicProcedure
        .input(z.object({ issueId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmComment.findMany({
                where: {
                    issueId: input.issueId,
                    parentId: null,
                    deletedAt: null
                } as any,
                include: {
                    author: { select: { id: true, name: true, image: true, email: true } },
                    mentions: true,
                    replies: {
                        include: {
                            author: { select: { id: true, name: true, image: true, email: true } },
                            mentions: true,
                        },
                        orderBy: { createdAt: "asc" }
                    }
                },
                orderBy: { createdAt: "asc" }
            });
        }),

    /**
     * Create a new comment (optionally a reply to another comment).
     */
    create: publicProcedure
        .input(z.object({
            issueId: z.string(),
            authorId: z.string(),
            content: z.string().min(1).max(10000),
            parentId: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            const { issueId, authorId, content } = input;
            // Normalize parentId: treat empty string as undefined (null in DB)
            const parentId = input.parentId && input.parentId.trim() !== "" ? input.parentId : undefined;

            try {
                // Validate author exists to produce a clear error instead of a FK failure
                let author = await prisma.user.findUnique({ where: { id: authorId } });
                if (!author && authorId.includes("@")) {
                    author = await prisma.user.findUnique({ where: { email: authorId } });
                }
                if (!author) throw new Error(`Author not found: ${authorId}`);

                // 1. Create the comment
                const comment = await prisma.pmComment.create({
                    data: { issueId, authorId: author.id, content, parentId },
                    include: {
                        author: { select: { id: true, name: true, image: true } },
                        issue: { select: { key: true, title: true, projectId: true, assigneeId: true, creatorId: true } }
                    }
                });

                // 2. Parse @mentions and resolve to users
                const handles = extractMentions(content);
                if (handles.length > 0) {
                    const mentionMap = await resolveMentions(handles);
                    const mentionedUserIds = [...mentionMap.values()];

                    // 3. Store mention records — use individual upserts so cuid() @default fires
                    if (mentionedUserIds.length > 0) {
                        await Promise.all(
                            mentionedUserIds.map(userId =>
                                prisma.pmCommentMention.upsert({
                                    where: { commentId_userId: { commentId: comment.id, userId } },
                                    update: {},
                                    create: { commentId: comment.id, userId },
                                })
                            )
                        );

                        // 4. Notify mentioned users
                        await notifyMany(
                            mentionedUserIds.filter(id => id !== authorId),
                            "mentioned",
                            `${comment.author.name || "Someone"} mentioned you in ${comment.issue.key}`,
                            {
                                issueId,
                                issueKey: comment.issue.key,
                                issueTitle: comment.issue.title,
                                commentId: comment.id,
                                actorName: comment.author.name ?? undefined,
                                projectId: comment.issue.projectId
                            }
                        );
                    }
                }

                // 5. Notify issue stakeholders (assignee + creator) if not the author
                const stakeholders = [
                    comment.issue.assigneeId,
                    comment.issue.creatorId
                ].filter((id): id is string => !!id && id !== authorId);

                if (stakeholders.length > 0) {
                    await notifyMany(
                        stakeholders,
                        "comment_added",
                        `${comment.author.name || "Someone"} commented on ${comment.issue.key}`,
                        {
                            issueId,
                            issueKey: comment.issue.key,
                            issueTitle: comment.issue.title,
                            commentId: comment.id,
                            actorName: comment.author.name ?? undefined,
                            projectId: comment.issue.projectId
                        }
                    );
                }

                // 6. Emit real-time update
                console.log(`[Socket] Emit comment-added to project:${comment.issue.projectId}`);

                return comment;
            } catch (err: any) {
                console.error("[pmComments.create] Error:", err?.message ?? err);
                throw new Error(err?.message ?? "Failed to create comment");
            }
        }),

    /**
     * Edit an existing comment (author only).
     */
    update: publicProcedure
        .input(z.object({
            id: z.string(),
            content: z.string().min(1).max(10000),
            authorId: z.string(), // For permission check
        }))
        .mutation(async ({ input }) => {
            const { id, content, authorId } = input;

            const existing = await prisma.pmComment.findUnique({ where: { id } });
            if (!existing) throw new Error("Comment not found");
            if (existing.authorId !== authorId) throw new Error("Only the author can edit this comment");

            return prisma.pmComment.update({
                where: { id },
                data: { content, editedAt: new Date() },
                include: {
                    author: { select: { id: true, name: true, image: true } }
                }
            });
        }),

    /**
     * Delete a comment (author or project admin).
     */
    delete: publicProcedure
        .input(z.object({
            id: z.string(),
            authorId: z.string(),
        }))
        .mutation(async ({ input }) => {
            const { id, authorId } = input;

            const existing = await prisma.pmComment.findUnique({ where: { id } });
            if (!existing) throw new Error("Comment not found");
            if (existing.authorId !== authorId) throw new Error("Only the author can delete this comment");

            await prisma.pmComment.update({ 
                where: { id },
                data: { deletedAt: new Date(), deletedById: authorId } as any
            });
            return { success: true };
        }),

    /**
     * Get comment count for an issue.
     */
    count: publicProcedure
        .input(z.object({ issueId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmComment.count({ where: { issueId: input.issueId, deletedAt: null } as any });
        }),
});

"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { Send, Edit2, Trash2, Reply, Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Simple markdown parser – renders bold, italic, code, and @mentions
function renderContent(content: string) {
    const parts = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-sm font-mono">$1</code>')
        .replace(/@([a-zA-Z0-9._-]+)/g, '<span class="text-primary font-medium">@$1</span>');
    return { __html: parts };
}

interface Comment {
    id: string;
    content: string;
    editedAt: Date | null;
    createdAt: Date;
    author: { id: string; name: string | null; image: string | null; email: string };
    replies: Comment[];
}

function CommentItem({
    comment,
    depth = 0,
    issueId,
    currentUserId,
    onRefetch,
}: {
    comment: Comment;
    depth?: number;
    issueId: string;
    currentUserId: string;
    onRefetch: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState("");

    const updateMutation = trpc.pmComments.update.useMutation({ onSuccess: () => { setIsEditing(false); onRefetch(); } });
    const deleteMutation = trpc.pmComments.delete.useMutation({ onSuccess: onRefetch });
    const createMutation = trpc.pmComments.create.useMutation({
        onSuccess: () => { setIsReplying(false); setReplyContent(""); onRefetch(); }
    });

    const isAuthor = comment.author.id === currentUserId;
    const maxDepth = 3;

    return (
        <div className={`flex gap-3 ${depth > 0 ? "ml-8 mt-3" : ""}`}>
            {/* Avatar */}
            <div className="flex-shrink-0">
                {comment.author.image ? (
                    <img src={comment.author.image} alt={comment.author.name ?? ""} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {(comment.author.name ?? comment.author.email).substring(0, 2).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.author.name ?? comment.author.email}</span>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                    {comment.editedAt && (
                        <span className="text-xs text-muted-foreground italic">(edited)</span>
                    )}
                </div>

                {/* Body */}
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className="w-full p-2 text-sm border border-border rounded-md bg-background min-h-[80px] resize-none focus:ring-1 focus:ring-primary outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => updateMutation.mutate({ id: comment.id, content: editContent, authorId: currentUserId })}
                                disabled={updateMutation.isPending}
                                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                            >
                                {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                            </button>
                            <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs border rounded-md hover:bg-muted">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div
                        className="text-sm text-foreground/90 leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/50"
                        dangerouslySetInnerHTML={renderContent(comment.content)}
                    />
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 mt-2">
                    {depth < maxDepth && (
                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            <Reply className="w-3 h-3" /> Reply
                        </button>
                    )}
                    {isAuthor && (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate({ id: comment.id, authorId: currentUserId })}
                                disabled={deleteMutation.isPending}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 className="w-3 h-3" /> Delete
                            </button>
                        </>
                    )}
                </div>

                {/* Reply box */}
                {isReplying && (
                    <div className="mt-3 space-y-2">
                        <textarea
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            placeholder="Write a reply... Use @name to mention"
                            className="w-full p-2 text-sm border border-border rounded-md bg-background min-h-[70px] resize-none focus:ring-1 focus:ring-primary outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => createMutation.mutate({ issueId, authorId: currentUserId, content: replyContent, parentId: comment.id })}
                                disabled={!replyContent.trim() || createMutation.isPending}
                                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                            >
                                {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reply"}
                            </button>
                            <button onClick={() => setIsReplying(false)} className="px-3 py-1 text-xs border rounded-md hover:bg-muted">Cancel</button>
                        </div>
                    </div>
                )}

                {/* Nested replies */}
                {comment.replies?.length > 0 && (
                    <div className="mt-3 space-y-3 border-l-2 border-border/50 pl-4">
                        {comment.replies.map(reply => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                depth={depth + 1}
                                issueId={issueId}
                                currentUserId={currentUserId}
                                onRefetch={onRefetch}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface IssueCommentsProps {
    issueId: string;
}

export function IssueComments({ issueId }: IssueCommentsProps) {
    const { data: session } = useSession();
    const currentUserId = (session?.user as any)?.id ?? "";

    const { data: comments, isLoading, refetch } = trpc.pmComments.list.useQuery({ issueId });
    const createMutation = trpc.pmComments.create.useMutation({
        onSuccess: () => { setNewComment(""); refetch(); }
    });

    const [newComment, setNewComment] = useState("");

    const handleSubmit = () => {
        if (!newComment.trim() || !currentUserId) return;
        createMutation.mutate({ issueId, authorId: currentUserId, content: newComment });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span>Comments{comments ? ` (${comments.length})` : ""}</span>
            </div>

            {/* Comment list */}
            {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : comments?.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
                    No comments yet. Be the first to comment!
                </div>
            ) : (
                <div className="space-y-6">
                    {comments?.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment as any}
                            issueId={issueId}
                            currentUserId={currentUserId}
                            onRefetch={refetch}
                        />
                    ))}
                </div>
            )}

            {/* New comment box */}
            {currentUserId && (
                <div className="flex gap-3 pt-4 border-t border-border">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {(session?.user?.name ?? session?.user?.email ?? "?").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-2">
                        <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
                            placeholder="Add a comment... Use @name to mention someone. (Ctrl+Enter to submit)"
                            className="w-full p-3 text-sm border border-border rounded-lg bg-background min-h-[100px] resize-none focus:ring-1 focus:ring-primary outline-none"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={!newComment.trim() || createMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                {createMutation.isPending
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Send className="w-3 h-3" />
                                }
                                Comment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

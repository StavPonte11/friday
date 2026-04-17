"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { MentionInput } from "./MentionInput";
import { Button } from "@/components/ui/button";

export function ThreadedComments({ issueId }: { issueId: string }) {
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    
    const utils = trpc.useUtils();
    const { data: comments, isLoading } = trpc.pmComments.list.useQuery({ issueId });
    const createComment = trpc.pmComments.create.useMutation({
        onSuccess: () => utils.pmComments.list.invalidate()
    });
    const addReaction = trpc.pmComments.react.useMutation({
        onSuccess: () => utils.pmComments.list.invalidate()
    });

    if (isLoading) return <div>Loading comments...</div>;

    const handleSubmitTopBlock = () => {
        if (!newComment.trim()) return;
        createComment.mutate({ issueId, content: newComment });
        setNewComment("");
    };

    const handleReply = (parentId: string) => {
        if (!replyContent.trim()) return;
        createComment.mutate({ issueId, content: replyContent, parentId });
        setReplyContent("");
        setReplyingTo(null);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {comments?.map((comment: any) => (
                    <div key={comment.id} className={`border rounded-lg p-4 shadow-sm ${comment.isPinned ? 'bg-muted/50 border-primary/50' : 'bg-card'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-sm">{comment.author?.name || 'Unknown'} {comment.isPinned && '📌'}</span>
                            <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm mb-3">{comment.content}</p>
                        
                        {/* Reactions & Actions */}
                        <div className="flex gap-2 mb-3">
                            <button onClick={() => addReaction.mutate({ commentId: comment.id, emoji: "👍" })} className="text-xs px-2 py-1 bg-muted rounded hover:bg-secondary">
                                👍 {comment.reactions?.filter((r: any) => r.emoji === "👍").length || 0}
                            </button>
                            <button onClick={() => addReaction.mutate({ commentId: comment.id, emoji: "🔥" })} className="text-xs px-2 py-1 bg-muted rounded hover:bg-secondary">
                                🔥 {comment.reactions?.filter((r: any) => r.emoji === "🔥").length || 0}
                            </button>
                            <button onClick={() => setReplyingTo(comment.id)} className="text-xs px-2 py-1 bg-muted rounded hover:bg-secondary ml-auto">
                                Reply
                            </button>
                        </div>
                        
                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-6 pl-4 border-l space-y-3 mt-4">
                                {comment.replies.map((reply: any) => (
                                    <div key={reply.id} className="pt-2">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-xs">{reply.author?.name || 'Unknown'}</span>
                                        </div>
                                        <p className="text-sm">{reply.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                            <div className="mt-4 ml-6 pl-4">
                                <MentionInput value={replyContent} onChange={setReplyContent} onSubmit={() => handleReply(comment.id)} />
                                <div className="mt-2 flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
                                    <Button size="sm" onClick={() => handleReply(comment.id)} disabled={createComment.isPending}>Reply</Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="border-t pt-4">
                 <MentionInput value={newComment} onChange={setNewComment} onSubmit={handleSubmitTopBlock} />
                 <div className="mt-2 flex justify-end">
                     <Button onClick={handleSubmitTopBlock} disabled={createComment.isPending}>Comment</Button>
                 </div>
            </div>
        </div>
    );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { Send, Edit2, Trash2, Reply, Loader2, MessageSquare, AtSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Simple markdown parser – renders bold, italic, code, and @mentions
function renderContent(content: string) {
    const parts = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-sm font-mono">$1</code>')
        .replace(/@([a-zA-Z0-9._-]+)/g, '<span class="text-primary font-medium bg-primary/10 px-1 rounded">@$1</span>');
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

// ── Mention-aware textarea ────────────────────────────────────────────────────

interface MentionInputProps {
    value: string;
    onChange: (val: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    minHeight?: string;
}

function MentionInput({ value, onChange, onSubmit, placeholder, minHeight = "100px" }: MentionInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStart, setMentionStart] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(0);

    const { data: mentionUsers = [], isFetching } = trpc.pmSearch.mentionUsers.useQuery(
        { query: mentionQuery ?? "" },
        { enabled: mentionQuery !== null }
    );

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const val = e.target.value;
        onChange(val);
        const cursor = e.target.selectionStart ?? 0;
        // Find active @mention before cursor
        const before = val.slice(0, cursor);
        const match = before.match(/@([a-zA-Z0-9._-]*)$/);
        if (match) {
            setMentionQuery(match[1]);
            setMentionStart(cursor - match[0].length);
            setDropdownOpen(true);
            setSelectedIdx(0);
        } else {
            setMentionQuery(null);
            setDropdownOpen(false);
        }
    }

    function insertMention(name: string) {
        const displayName = name.replace(/\s+/g, "");
        const before = value.slice(0, mentionStart);
        const after = value.slice(textareaRef.current?.selectionStart ?? mentionStart + (mentionQuery?.length ?? 0) + 1);
        const newVal = `${before}@${displayName} ${after}`;
        onChange(newVal);
        setDropdownOpen(false);
        setMentionQuery(null);
        setTimeout(() => textareaRef.current?.focus(), 0);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (dropdownOpen && mentionUsers.length > 0) {
            if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, mentionUsers.length - 1)); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                const user = mentionUsers[selectedIdx];
                if (user) insertMention(user.name ?? user.email);
                return;
            }
            if (e.key === "Escape") { setDropdownOpen(false); return; }
        }
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSubmit();
        }
    }

    return (
        <div className="relative flex-1">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder ?? "Add a comment... Type @ to mention someone. (Ctrl+Enter to submit)"}
                className={`w-full p-3 text-sm border border-border rounded-lg bg-background resize-none focus:ring-1 focus:ring-primary outline-none transition-all`}
                style={{ minHeight }}
            />
            {/* Hint */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground pointer-events-none">
                <AtSign size={10} />
                <span>mention</span>
            </div>

            {/* Mention dropdown */}
            {dropdownOpen && (mentionUsers.length > 0 || isFetching) && (
                <div className="absolute z-50 left-0 mt-1 w-64 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                    {isFetching && mentionUsers.length === 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                            <Loader2 size={12} className="animate-spin" /> Searching...
                        </div>
                    )}
                    {mentionUsers.map((user, i) => (
                        <button
                            key={user.id}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); insertMention(user.name ?? user.email); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${i === selectedIdx ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                            {user.image ? (
                                <img src={user.image} className="w-6 h-6 rounded-full object-cover" alt="" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                    {(user.name ?? user.email).substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="font-medium truncate">{user.name ?? user.email}</p>
                                {user.name && <p className={`text-xs truncate ${i === selectedIdx ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{user.email}</p>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Comment item ──────────────────────────────────────────────────────────────

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
                        <MentionInput
                            value={editContent}
                            onChange={setEditContent}
                            onSubmit={() => updateMutation.mutate({ id: comment.id, content: editContent, authorId: currentUserId })}
                            minHeight="80px"
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
                        className="text-sm text-foreground/90 leading-relaxed"
                        dangerouslySetInnerHTML={renderContent(comment.content)}
                    />
                )}

                {/* Actions */}
                {!isEditing && (
                    <div className="flex items-center gap-2 mt-2">
                        {depth < maxDepth && (
                            <button
                                onClick={() => setIsReplying(!isReplying)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Reply className="w-3 h-3" /> Reply
                            </button>
                        )}
                        {isAuthor && (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                )}

                {/* Reply input */}
                {isReplying && (
                    <div className="mt-3 flex gap-2">
                        <MentionInput
                            value={replyContent}
                            onChange={setReplyContent}
                            onSubmit={() => createMutation.mutate({ issueId, authorId: currentUserId, content: replyContent, parentId: comment.id })}
                            placeholder={`Reply to ${comment.author.name ?? comment.author.email}...`}
                            minHeight="70px"
                        />
                        <button
                            onClick={() => createMutation.mutate({ issueId, authorId: currentUserId, content: replyContent, parentId: comment.id })}
                            disabled={!replyContent.trim() || createMutation.isPending}
                            className="self-end px-3 py-2 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                        >
                            {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        </button>
                    </div>
                )}

                {/* Replies */}
                {comment.replies?.length > 0 && (
                    <div className="mt-3 border-l-2 border-border/40 pl-4 space-y-3">
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

// ── Main export ───────────────────────────────────────────────────────────────

interface IssueCommentsProps {
    issueId: string;
}

export function IssueComments({ issueId }: IssueCommentsProps) {
    const { data: session } = useSession();
    const currentUserId = (session?.user as any)?.id || session?.user?.email || "admin@friday.local";

    const { data: comments, isLoading, refetch } = trpc.pmComments.list.useQuery({ issueId });
    const createMutation = trpc.pmComments.create.useMutation({
        onSuccess: () => { setNewComment(""); refetch(); },
        onError: (err) => { console.error("Failed to add comment:", err.message); }
    });

    const [newComment, setNewComment] = useState("");

    const handleSubmit = () => {
        if (!newComment.trim()) return;
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
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">
                        {(session?.user?.name ?? session?.user?.email ?? "?").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-2">
                        <MentionInput
                            value={newComment}
                            onChange={setNewComment}
                            onSubmit={handleSubmit}
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">
                                Supports **bold**, *italic*, `code`, and @mentions
                            </span>
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

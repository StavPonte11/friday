"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { 
    GitBranch, 
    GitPullRequest, 
    Plus, 
    ExternalLink, 
    Trash2, 
    Loader2, 
    RefreshCw,
    AlertTriangle
} from "lucide-react";

interface GitLabLinkPanelProps {
    issueId: string;
    projectId: string;
}

export function GitLabLinkPanel({ issueId, projectId }: GitLabLinkPanelProps) {
    const [isLinking, setIsLinking] = useState(false);
    const [glProjectId, setGlProjectId] = useState("");
    const [glIid, setGlIid] = useState("");
    const [linkType, setLinkType] = useState<"ISSUE" | "MERGE_REQUEST">("MERGE_REQUEST");

    const utils = trpc.useUtils();
    const { data: links, isLoading, refetch } = trpc.pmGitLab.listLinks.useQuery({ issueId });
    
    const linkMutation = trpc.pmGitLab.linkIssue.useMutation({
        onSuccess: () => {
            setIsLinking(false);
            setGlIid("");
            utils.pmGitLab.listLinks.invalidate({ issueId });
        }
    });

    const unlinkMutation = trpc.pmGitLab.unlink.useMutation({
        onSuccess: () => utils.pmGitLab.listLinks.invalidate({ issueId })
    });

    const handleLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (!glProjectId || !glIid) return;
        linkMutation.mutate({
            issueId,
            gitlabProjectId: parseInt(glProjectId),
            gitlabIssueIid: parseInt(glIid),
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
                        <GitBranch size={18} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">GitLab Integration</h3>
                        <p className="text-[11px] text-muted-foreground">Trace code changes and merge requests back to this issue.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsLinking(!isLinking)}
                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                    <Plus size={18} className={`transition-transform duration-200 ${isLinking ? 'rotate-45' : ''}`} />
                </button>
            </div>

            {isLinking && (
                <form onSubmit={handleLink} className="bg-muted/30 border border-border rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Type</label>
                            <select 
                                value={linkType}
                                onChange={(e) => setLinkType(e.target.value as any)}
                                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="MERGE_REQUEST">Merge Request</option>
                                <option value="ISSUE">GitLab Issue</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Project ID</label>
                            <input 
                                type="text" 
                                placeholder="e.g. 12345"
                                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                                value={glProjectId}
                                onChange={(e) => setGlProjectId(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">IID (Internal ID)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="e.g. 42"
                                className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                                value={glIid}
                                onChange={(e) => setGlIid(e.target.value)}
                                required
                            />
                            <button 
                                type="submit"
                                disabled={linkMutation.isPending}
                                className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                            >
                                {linkMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Link"}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 size={24} className="animate-spin text-muted-foreground/50" />
                    </div>
                ) : links?.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-border rounded-xl bg-muted/20">
                        <GitPullRequest size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground italic">No GitLab items linked yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {links?.map(link => (
                            <div key={link.id} className="group relative bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-all flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${(link as any).linkType === 'MERGE_REQUEST' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                    {(link as any).linkType === 'MERGE_REQUEST' ? <GitPullRequest size={14} /> : <AlertTriangle size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold truncate capitalize">{(link as any).linkType?.toLowerCase().replace('_', ' ') || 'Link'} !{(link as any).gitlabIssueId}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 font-bold uppercase">Open</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                                        Project ID: {link.gitlabProjectId} • Last synced 2m ago
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a 
                                        href={(link as any).gitlabUrl || `#`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-muted-foreground hover:bg-secondary rounded-md transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                    <button 
                                        onClick={() => unlinkMutation.mutate({ id: link.id })}
                                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!isLoading && (links?.length || 0) > 0 && (
                <div className="flex justify-center">
                    <button 
                        onClick={() => refetch()}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                        <RefreshCw size={10} /> Full Resync
                    </button>
                </div>
            )}
        </div>
    );
}

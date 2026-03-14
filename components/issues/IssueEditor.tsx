"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { Loader2, Save, User, Hash, Clock, History, AlertCircle, MessageSquare, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { IssueComments } from "./IssueComments";
import { IssueAttachments } from "./IssueAttachments";
import { GitLabLinkPanel } from "./GitLabLinkPanel";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
// import { PmIssuePriority } from "@prisma/client"; // Failing to export for some reason in IDE
const PmIssuePriority = {
    NONE: "NONE",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    URGENT: "URGENT"
} as any;

import { DEFAULT_STATUSES } from "./CreateIssueModal";
import { GitBranch } from "lucide-react";

interface IssueEditorProps {
    issueId: string;
    projectId: string;
}

export function IssueEditor({ issueId, projectId }: IssueEditorProps) {
    const { data: session } = useSession();
    const utils = trpc.useUtils();

    const { data: issue, isLoading } = trpc.pmIssues.getById.useQuery({ id: issueId });
    const { data: users } = trpc.workspaces.members.useQuery({ workspaceId: (issue as any)?.workspaceId || "" }, { enabled: !!issue });
    const { data: sprints } = trpc.pmSprints.listByProject.useQuery({ projectId });

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [activeTab, setActiveTab] = useState<"activity" | "comments" | "attachments" | "gitlab">("activity");

    const updateIssue = trpc.pmIssues.update.useMutation({
        onMutate: async (newValues) => {
            await utils.pmIssues.getById.cancel({ id: issueId });
            const previous = utils.pmIssues.getById.getData({ id: issueId });

            if (previous) {
                // @ts-ignore
                utils.pmIssues.getById.setData({ id: issueId }, {
                    ...previous,
                    ...newValues,
                    assignee: users?.find((u: any) => u.user.id === newValues.assigneeId)?.user || previous.assignee,
                    sprint: sprints?.find((s: any) => s.id === newValues.sprintId) || previous.sprint,
                });
            }
            return { previous };
        },
        onError: (err, newValues, context) => {
            if (context?.previous) {
                utils.pmIssues.getById.setData({ id: issueId }, context.previous);
            }
        },
        onSettled: () => {
            utils.pmIssues.getById.invalidate({ id: issueId });
            utils.pmIssues.listByProject.invalidate({ projectId });
            utils.pmProjects.list.invalidate(); // For board updates
        }
    });

    useEffect(() => {
        if (issue) {
            setTitle(issue.title);
            setDescription(issue.description || "");
        }
    }, [issue]);

    if (isLoading || !issue) {
        return <div className="flex h-full items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    const handleSaveTitle = () => {
        const userId = (session?.user as any)?.id;
        if (title.trim() && title !== issue.title && userId) {
            updateIssue.mutate({ id: issueId, title: title.trim(), actorId: userId });
        }
        setIsEditingTitle(false);
    };

    const handleSaveDescription = () => {
        const userId = (session?.user as any)?.id;
        if (description.trim() !== (issue.description || "") && userId) {
            updateIssue.mutate({ id: issueId, description: description.trim(), actorId: userId });
        }
    };

    const handleFieldUpdate = (field: string, value: any) => {
        const userId = (session?.user as any)?.id;
        if (!userId) return;
        updateIssue.mutate({ id: issueId, [field]: value, actorId: userId });
    };

    return (
        <div className="flex flex-col h-full bg-card overflow-y-auto w-full">
            <div className="p-6 space-y-6">

                {/* Header / Title */}
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Hash size={14} /> {issue.key}
                        </span>
                        <span>•</span>
                        <span>{issue.type || "TASK"}</span>
                    </div>

                    {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                                onBlur={handleSaveTitle}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                                className="text-xl font-bold h-12"
                            />
                        </div>
                    ) : (
                        <h1
                            className="text-2xl font-bold cursor-text hover:bg-muted/50 p-1 -ml-1 rounded transition-colors"
                            onClick={() => setIsEditingTitle(true)}
                        >
                            {issue.title}
                        </h1>
                    )}
                </div>

                {/* Main Grid: Description + Attributes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    <div className="md:col-span-2 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <AlertCircle size={16} /> Description
                            </h3>
                            <div className="relative group">
                                <Textarea
                                    className="min-h-[200px] resize-y p-4 text-base bg-muted/20 border-border focus:bg-background transition-colors"
                                    placeholder="Add a description... supports markdown"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={handleSaveDescription}
                                />
                                {description !== (issue.description || "") && (
                                    <Button
                                        size="sm"
                                        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={handleSaveDescription}
                                        disabled={updateIssue.isPending}
                                    >
                                        {updateIssue.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Tabbed section: Activity / Comments / Attachments */}
                        <div className="pt-8 border-t border-border mt-8">
                            {/* Tab navigation */}
                            <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto no-scrollbar">
                                {(["activity", "comments", "attachments", "gitlab"] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors capitalize border-b-2 -mb-px ${activeTab === tab
                                                ? "border-primary text-primary"
                                                : "border-transparent text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        {tab === "activity" && <History size={14} />}
                                        {tab === "comments" && <MessageSquare size={14} />}
                                        {tab === "attachments" && <Paperclip size={14} />}
                                        {tab === "gitlab" && <GitBranch size={14} />}
                                        <span className="whitespace-nowrap">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                                    </button>
                                ))}
                            </div>

                            {activeTab === "activity" && (
                                <div className="space-y-4">
                                    {issue.activities && issue.activities.length > 0 ? (
                                        // @ts-ignore
                                        issue.activities.map((activity: any) => (
                                            <div key={activity.id} className="flex gap-3 text-sm">
                                                <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-xs font-bold font-mono">
                                                    {activity.actor?.name?.substring(0, 2).toUpperCase() || "U"}
                                                </div>
                                                <div className="flex-1 bg-muted/30 p-3 rounded-lg border border-border/50">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium">{activity.actor?.name || "Unknown User"}</span>
                                                        <span className="text-xs text-muted-foreground text-right ml-4">
                                                            {new Date(activity.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground">
                                                        Updated <strong className="text-foreground capitalize">{activity.field}</strong> from <code className="bg-muted px-1 rounded text-xs">{activity.oldValue || "empty"}</code> to <code className="bg-muted px-1 rounded text-xs">{activity.newValue || "empty"}</code>
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No activity recorded yet.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === "comments" && (
                                <IssueComments issueId={issueId} />
                            )}

                            {activeTab === "attachments" && (
                                <IssueAttachments issueId={issueId} />
                            )}

                            {activeTab === "gitlab" && (
                                <GitLabLinkPanel issueId={issueId} projectId={projectId} />
                            )}
                        </div>
                    </div>

                    {/* Sidebar Attributes */}
                    <div className="space-y-6">
                        <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-4">

                            {/* Status */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Status</label>
                                <Select value={issue.status} onValueChange={(val) => handleFieldUpdate("status", val)}>
                                    <SelectTrigger className="w-full bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Allow freeform dynamically mapped statuses based on project workflow later, but default for now */}
                                        {DEFAULT_STATUSES.map(s => (
                                            <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Priority */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Priority</label>
                                <Select value={issue.priority} onValueChange={(val) => handleFieldUpdate("priority", val)}>
                                    <SelectTrigger className="w-full bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.values(PmIssuePriority).map((p: any) => (
                                            <SelectItem key={p} value={p}>{p.toLowerCase()}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Assignee */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Assignee</label>
                                <Select value={issue.assigneeId || "unassigned"} onValueChange={(val) => handleFieldUpdate("assigneeId", val === "unassigned" ? null : val)}>
                                    <SelectTrigger className="w-full bg-background">
                                        <SelectValue>
                                            {issue.assignee ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                                        {issue.assignee.name?.[0].toUpperCase()}
                                                    </div>
                                                    <span>{issue.assignee.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground flex items-center gap-2"><User size={14} /> Unassigned</span>
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned" className="text-muted-foreground italic">Unassigned</SelectItem>
                                        {users?.map((u: any) => (
                                            <SelectItem key={u.user.id} value={u.user.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{u.user.name || u.user.email}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Sprint */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Sprint</label>
                                <Select value={issue.sprintId || "none"} onValueChange={(val) => handleFieldUpdate("sprintId", val === "none" ? null : val)}>
                                    <SelectTrigger className="w-full bg-background">
                                        <SelectValue>
                                            {issue.sprint ? issue.sprint.name : <span className="text-muted-foreground italic">No Sprint</span>}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-muted-foreground italic">No Sprint (Backlog)</SelectItem>
                                        {sprints?.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.status.toLowerCase()})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Estimates */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-1"><Hash size={10} /> Points</label>
                                    <Input
                                        type="number"
                                        defaultValue={issue.storyPoints || ""}
                                        className="h-8 text-sm"
                                        placeholder="0"
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            handleFieldUpdate("storyPoints", isNaN(val) ? null : val);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") e.currentTarget.blur();
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-1"><Clock size={10} /> Complexity</label>
                                    <Input
                                        type="number"
                                        defaultValue={(issue as any).complexityScore || ""}
                                        className="h-8 text-sm"
                                        placeholder="1-10"
                                        min={1} max={10}
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            handleFieldUpdate("complexityScore", isNaN(val) ? null : val);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") e.currentTarget.blur();
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { trpc } from "@/lib/trpc/client";
import { DndContext, DragEndEvent, DragStartEvent, closestCorners, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import io from "socket.io-client";
import { SprintPlannerModal } from "@/components/issues/SprintPlannerModal";
import { Building } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IssueEditor } from "@/components/issues/IssueEditor";
import { useSession } from "next-auth/react";

const DEFAULT_COLUMNS = [
    { id: "TODO", title: "To Do" },
    { id: "IN_PROGRESS", title: "In Progress" },
    { id: "IN_REVIEW", title: "In Review" },
    { id: "DONE", title: "Done" }
];

let socket: ReturnType<typeof io> | undefined;

function BoardColumn({ id, title, children, count }: { id: string, title: string, children: React.ReactNode, count: number }) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className="w-80 flex-shrink-0 flex flex-col bg-muted/40 rounded-xl" id={id}>
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-sm">{title}</h3>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                    {count}
                </span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[300px]">
                {children}
            </div>
        </div>
    );
}

function BoardCard({ issue, onClick }: { issue: any, onClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: issue.id,
        data: { issue }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.8 : 1
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners} 
            onClick={onClick}
            className="bg-card border border-border p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
        >
            <div className="text-sm font-medium mb-2 leading-tight">{issue.title}</div>
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono bg-muted border border-border/50 px-1 py-0.5 rounded text-[10px] uppercase">{issue.key}</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
                    {issue.assignee?.name?.substring(0, 2).toUpperCase() || '?'}
                </div>
            </div>
        </div>
    );
}



export default function KanbanBoardPage() {
    const locale = useLocale();
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");

    // Fetch all PM Projects
    const { data: projects, isLoading: isProjectsLoading } = trpc.pmProjects.list.useQuery();

    useEffect(() => {
        if (projects && projects.length > 0 && (!selectedProjectId || !projects.find((p: any) => p.id === selectedProjectId))) {
            setSelectedProjectId(projects[0].id);
        } else if (projects?.length === 0) {
            setSelectedProjectId("");
        }
    }, [projects, selectedProjectId]);

    const { data: initialIssues, refetch } = trpc.pmIssues.listByProject.useQuery(
        { projectId: selectedProjectId },
        { enabled: !!selectedProjectId }
    );
    const updateIssue = trpc.pmIssues.update.useMutation();
    const { data: session } = useSession();

    const [issues, setIssues] = useState<any[]>([]);
    const [activeIssue, setActiveIssue] = useState<any | null>(null);
    const [selectedIssueIdForEdit, setSelectedIssueIdForEdit] = useState<string | null>(null);

    useEffect(() => {
        if (initialIssues) setIssues(initialIssues);
    }, [initialIssues]);

    useEffect(() => {
        if (!selectedProjectId) return;

        socket = io(process.env.NEXT_PUBLIC_SITE_URL || "", { path: "/api/socket/io" });

        socket?.on("connect", () => {
            socket?.emit("join-project", selectedProjectId);
        });

        socket?.on("issue-moved", (data: { issueId: string, newStatus: string }) => {
            setIssues(prev => prev.map(issue => issue.id === data.issueId ? { ...issue, status: data.newStatus } : issue));
        });

        return () => { socket?.disconnect(); };
    }, [selectedProjectId]);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveIssue(issues.find((i: any) => i.id === active.id) || null);
    };

    const currentProject = projects?.find((p: any) => p.id === selectedProjectId);
    const activeColumns = (currentProject?.workflow as any)?.columns || DEFAULT_COLUMNS;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveIssue(null);

        // Naive column dropping logic for foundation phase
        if (over && activeColumns.map((c: any) => c.id).includes(over.id as string)) {
            const issueId = active.id;
            const newStatus = over.id;

            const updatedIssues = issues.map((issue: any) =>
                issue.id === issueId ? { ...issue, status: newStatus } : issue
            );

            setIssues(updatedIssues);

            // Optimistically broadcast real-time
            if (socket && selectedProjectId) {
                socket.emit("issue-moved", { projectId: selectedProjectId, issueId, newStatus });
            }

            const userId = (session?.user as any)?.id;
            if (userId) {
                updateIssue.mutate({ 
                    id: String(issueId), 
                    status: String(newStatus), 
                    actorId: userId 
                });
            }
        }
    };

    return (
        <div className="h-full flex flex-col pt-6 pb-0 overflow-hidden w-full mx-auto space-y-4">
            <div className="px-6 flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Active Board</h2>
                    <p className="text-muted-foreground">Sprint 1 • 2 Days Remaining</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
                        <Building size={16} className="text-muted-foreground" />
                        <select 
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none w-40"
                            disabled={isProjectsLoading}
                        >
                            {isProjectsLoading ? (
                                <option>Loading...</option>
                            ) : projects?.length ? (
                                projects.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))
                            ) : (
                                <option value="">No projects</option>
                            )}
                        </select>
                    </div>
                    {selectedProjectId && <SprintPlannerModal projectId={selectedProjectId} />}
                </div>
            </div>

            <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex-1 overflow-x-auto flex gap-6 px-6 pb-6">
                    {/* Render columns using Droppable component */}
                    {activeColumns.map((column: any) => (
                        <BoardColumn 
                            key={column.id} 
                            id={column.id} 
                            title={column.title} 
                            count={issues.filter((i: any) => i.status === column.id).length}
                        >
                            {/* Render cards using Draggable component */}
                            {issues.filter((issue: any) => issue.status === column.id).map((issue: any) => (
                                <BoardCard 
                                    key={issue.id} 
                                    issue={issue} 
                                    onClick={() => setSelectedIssueIdForEdit(issue.id)} 
                                />
                            ))}
                        </BoardColumn>
                    ))}
                </div>
            </DndContext>

            <Dialog open={!!selectedIssueIdForEdit} onOpenChange={(open) => !open && setSelectedIssueIdForEdit(null)}>
                <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col">
                    <DialogTitle className="sr-only">Issue Editor</DialogTitle>
                    {selectedIssueIdForEdit && (
                        <IssueEditor issueId={selectedIssueIdForEdit} projectId={selectedProjectId} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

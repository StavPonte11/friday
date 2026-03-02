"use client";

import { trpc } from "@/lib/trpc/client";
import { DndContext, DragEndEvent, DragStartEvent, closestCorners } from "@dnd-kit/core";
import { PmIssueStatus } from "@prisma/client";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import io from "socket.io-client";

const MOCK_PROJECT_ID = "cm7k12abc0001xyz";

const COLUMNS = [
    { id: PmIssueStatus.TODO, title: "To Do" },
    { id: PmIssueStatus.IN_PROGRESS, title: "In Progress" },
    { id: PmIssueStatus.IN_REVIEW, title: "In Review" },
    { id: PmIssueStatus.DONE, title: "Done" }
];

let socket: ReturnType<typeof io> | undefined;

export default function KanbanBoardPage() {
    const locale = useLocale();
    const { data: initialIssues, refetch } = trpc.pmIssues.listByProject.useQuery({ projectId: MOCK_PROJECT_ID });
    const updateIssue = trpc.pmIssues.create.useMutation(); // Using create mutation router temp fallback for update. In reality we'd use a .update mutation.

    const [issues, setIssues] = useState<any[]>([]);
    const [activeIssue, setActiveIssue] = useState<any | null>(null);

    useEffect(() => {
        if (initialIssues) setIssues(initialIssues);
    }, [initialIssues]);

    useEffect(() => {
        socket = io(process.env.NEXT_PUBLIC_SITE_URL || "", { path: "/api/socket/io" });

        socket?.on("connect", () => {
            socket?.emit("join-project", MOCK_PROJECT_ID);
        });

        socket?.on("issue-moved", (data: { issueId: string, newStatus: string }) => {
            setIssues(prev => prev.map(issue => issue.id === data.issueId ? { ...issue, status: data.newStatus } : issue));
        });

        return () => { socket?.disconnect(); };
    }, []);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveIssue(issues.find((i: any) => i.id === active.id) || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveIssue(null);

        // Naive column dropping logic for foundation phase
        if (over && COLUMNS.map(c => c.id as string).includes(over.id as string)) {
            const issueId = active.id;
            const newStatus = over.id;

            const updatedIssues = issues.map((issue: any) =>
                issue.id === issueId ? { ...issue, status: newStatus } : issue
            );

            setIssues(updatedIssues);

            // Optimistically broadcast real-time
            if (socket) {
                socket.emit("issue-moved", { projectId: MOCK_PROJECT_ID, issueId, newStatus });
            }

            // In real app: updateIssue.mutate({ id: issueId, status: newStatus });
        }
    };

    return (
        <div className="h-full flex flex-col pt-6 pb-0 overflow-hidden w-full mx-auto space-y-4">
            <div className="px-6">
                <h2 className="text-2xl font-bold tracking-tight">Active Board</h2>
                <p className="text-muted-foreground">Sprint 1 • 2 Days Remaining</p>
            </div>

            <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex-1 overflow-x-auto flex gap-6 px-6 pb-6">
                    {COLUMNS.map(column => (
                        <div key={column.id} className="w-80 flex-shrink-0 flex flex-col bg-muted/40 rounded-xl" id={column.id}>
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h3 className="font-semibold text-sm">{column.title}</h3>
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                                    {issues.filter(i => i.status === column.id).length}
                                </span>
                            </div>
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[300px]">
                                {/* Basic Sortable Context. A true KanBan needs active droppable areas mapped explicitly to the columns. */}
                                {issues.filter((issue: any) => issue.status === column.id).map((issue: any) => (
                                    <div key={issue.id} className="bg-card border border-border p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors">
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
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DndContext>
        </div>
    );
}

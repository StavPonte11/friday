"use client";

import { use, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/pm/EmptyState";
import { LoadingState } from "@/components/ui/loading-state";

export default function GanttPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = use(params);
    const { data: issues, isLoading } = trpc.pmIssues.listForGantt.useQuery({ projectId });
    
    // Calculate global bounds for proportional rendering
    const bounds = useMemo(() => {
        if (!issues || issues.length === 0) return null;
        
        let minDate = new Date();
        let maxDate = new Date();
        let hasValidDates = false;
        
        issues.forEach((issue: any) => {
            if (issue.startDate && issue.dueDate) {
                const s = new Date(issue.startDate);
                const e = new Date(issue.dueDate);
                if (!hasValidDates) {
                    minDate = s;
                    maxDate = e;
                    hasValidDates = true;
                } else {
                    if (s < minDate) minDate = s;
                    if (e > maxDate) maxDate = e;
                }
            }
        });
        
        if (!hasValidDates) return null;
        
        // Add 7 days padding on ends
        const start = new Date(minDate);
        start.setDate(start.getDate() - 7);
        const end = new Date(maxDate);
        end.setDate(end.getDate() + 7);
        
        const totalSpan = end.getTime() - start.getTime();
        return { start, end, totalSpan };
    }, [issues]);
    
    if (isLoading) return <LoadingState />;
    
    if (!issues || issues.length === 0) {
        return <EmptyState title="No Issues" description="Create issues with start and due dates to see them here." />;
    }
    
    return (
        <div className="p-6 h-full overflow-y-auto w-full overflow-x-auto flex flex-col">
            <h2 className="text-2xl font-bold mb-6">Gantt View</h2>
            <div className="min-w-[800px] border rounded-lg bg-card flex-1">
                <div className="flex border-b font-medium text-muted-foreground p-3 bg-muted/50">
                    <div className="w-[30%] border-r pr-4">Issue</div>
                    <div className="flex-1 flex justify-between px-4">
                        <span>{bounds?.start.toLocaleDateString() ?? 'Start'}</span>
                        <span className="text-xs uppercase tracking-widest text-center mt-1">Timeline</span>
                        <span>{bounds?.end.toLocaleDateString() ?? 'End'}</span>
                    </div>
                </div>
                {issues.map((issue: any) => {
                    const hasDates = issue.startDate && issue.dueDate;
                    
                    let leftPct = 10;
                    let widthPct = 80;
                    
                    if (hasDates && bounds) {
                        const sTime = new Date(issue.startDate).getTime();
                        const eTime = new Date(issue.dueDate).getTime();
                        leftPct = ((sTime - bounds.start.getTime()) / bounds.totalSpan) * 100;
                        widthPct = ((eTime - sTime) / bounds.totalSpan) * 100;
                        widthPct = Math.max(1, widthPct); // At least 1% wide
                    }

                    return (
                        <div key={issue.id} className="flex border-b last:border-0 p-3 items-center hover:bg-muted/30 transition-colors">
                            <div className="w-[30%] border-r font-medium truncate pr-4 text-sm" title={issue.title}>
                                <span className="text-xs text-muted-foreground mr-2">{issue.key}</span>
                                {issue.title}
                            </div>
                            <div className="flex-1 relative h-8 mx-4 flex items-center overflow-hidden">
                                {hasDates ? (
                                    <div 
                                        className="absolute inset-y-0 h-6 my-auto bg-primary text-primary-foreground rounded-md flex items-center justify-center px-3 text-[10px] font-semibold whitespace-nowrap shadow-sm hover:ring-2 ring-primary/50 transition-all" 
                                        style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '40px' }}
                                    >
                                        <div className="truncate">
                                            {new Date(issue.startDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                                            {' - '}
                                            {new Date(issue.dueDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground italic pl-2">No dates set</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

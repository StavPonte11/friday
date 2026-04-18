"use client";

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { keepPreviousData } from "@tanstack/react-query";
import { ViewFilter } from "@/types/gantt";
import { TimelineFilters } from "./TimelineFilters";
import { GanttView } from "./GanttView";
import { CalendarView } from "./CalendarView";
import { Loader2, LayoutGrid, CalendarDays, BarChart2 } from "lucide-react";

export function TimelineManager() {
    const [viewMode, setViewMode] = useState<"gantt" | "calendar">("gantt");
    const [filters, setFilters] = useState<ViewFilter>({});

    const { data: issues, isLoading } = trpc.pmTimeline.getUnifiedTimeline.useQuery(filters, {
        placeholderData: keepPreviousData,
    });

    const metrics = useMemo(() => {
        if (!issues) return { delayed: 0, overloaded: 0, total: 0 };
        const now = new Date();
        const delayed = issues.filter(i => i.dueDate && new Date(i.dueDate) < now && i.status !== "DONE").length;
        
        // Basic overloaded logic: user has > 3 active tasks assigned
        const assigneeCounts = issues.reduce((acc: any, curr) => {
            if (curr.assigneeId && curr.status !== "DONE") {
                acc[curr.assigneeId] = (acc[curr.assigneeId] || 0) + 1;
            }
            return acc;
        }, {});
        
        const overloaded = Object.values(assigneeCounts).filter((c: any) => c > 3).length;

        return { delayed, overloaded, total: issues.length };
    }, [issues]);

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header Area */}
            <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-primary" />
                        Time Intelligence Layer
                    </h2>
                    <p className="text-sm text-muted-foreground">Unified cross-board schedule and dependency insights</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Manager Insights Widget */}
                    <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 text-xs">
                        <div className={`flex items-center gap-1.5 ${metrics.delayed > 0 ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
                            <span className={`w-2 h-2 rounded-full ${metrics.delayed > 0 ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
                            {metrics.delayed} Overdue Tasks
                        </div>
                        <div className="w-px h-4 bg-border/50" />
                        <div className={`flex items-center gap-1.5 ${metrics.overloaded > 0 ? "text-orange-500 font-bold" : "text-muted-foreground"}`}>
                            <span className={`w-2 h-2 rounded-full ${metrics.overloaded > 0 ? "bg-orange-500" : "bg-muted-foreground"}`} />
                            {metrics.overloaded} Overloaded Users
                        </div>
                    </div>

                    <div className="w-px h-6 bg-border mx-2" />

                    {/* View Toggles */}
                    <div className="flex items-center bg-muted p-1 rounded-lg">
                        <button 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${viewMode === "gantt" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                            onClick={() => setViewMode("gantt")}
                        >
                            <LayoutGrid className="w-4 h-4" /> Gantt
                        </button>
                        <button 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${viewMode === "calendar" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                            onClick={() => setViewMode("calendar")}
                        >
                            <CalendarDays className="w-4 h-4" /> Calendar
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters Area */}
            <div className="px-6 py-2 border-b border-border bg-card/50 shrink-0">
                <TimelineFilters filters={filters} onFiltersChange={setFilters} />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-muted/10">
                {isLoading && !issues ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm font-medium animate-pulse text-muted-foreground">Aggregating timeline...</p>
                        </div>
                    </div>
                ) : null}

                {issues && issues.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No issues found matching the current filters across your boards.
                    </div>
                ) : (
                    <>
                        {viewMode === "gantt" && <GanttView issues={issues || []} />}
                        {viewMode === "calendar" && <CalendarView issues={issues || []} />}
                    </>
                )}
            </div>
        </div>
    );
}

"use client";

import React, { useMemo } from "react";
import { GanttItem } from "@/types/gantt";
import { format, differenceInDays, addDays, startOfWeek, endOfWeek } from "date-fns";

interface GanttViewProps {
    issues: GanttItem[];
}

export function GanttView({ issues }: GanttViewProps) {
    // 1. Determine timeline boundaries
    const { startDate, endDate, totalDays } = useMemo(() => {
        let minDate = new Date();
        let maxDate = addDays(new Date(), 30); // Default to at least 30 days ahead

        issues.forEach(issue => {
            const startStr = issue.startDate || new Date();
            const endStr = issue.dueDate || addDays(startStr, 7);
            
            if (startStr && new Date(startStr) < minDate) {
                minDate = new Date(startStr);
            }
            if (endStr && new Date(endStr) > maxDate) {
                maxDate = new Date(endStr);
            }
        });

        // Add padding
        minDate = startOfWeek(addDays(minDate, -7));
        maxDate = endOfWeek(addDays(maxDate, 14));

        return {
            startDate: minDate,
            endDate: maxDate,
            totalDays: differenceInDays(maxDate, minDate) + 1
        };
    }, [issues]);

    // Generate days array for headers
    const days = useMemo(() => {
        return Array.from({ length: totalDays }).map((_, i) => addDays(startDate, i));
    }, [startDate, totalDays]);

    const DAY_WIDTH = 64; // pixels per day, larger for visibility

    // Group issues by Project
    const issuesByProject = useMemo(() => {
        const groups: Record<string, { projectName: string, items: GanttItem[] }> = {};
        issues.forEach(issue => {
            if (!groups[issue.projectId]) {
                groups[issue.projectId] = { projectName: issue.projectName, items: [] };
            }
            groups[issue.projectId].items.push(issue);
        });
        return groups;
    }, [issues]);

    return (
        <div className="h-full w-full flex flex-col bg-background">
            {/* Scrollable Container */}
            <div className="flex-1 overflow-auto relative">
                
                {/* Gantt Header Wrapper */}
                <div className="sticky top-0 z-20 flex border-b border-border bg-card shadow-sm">
                    {/* Left Fixed Column (Titles) */}
                    <div className="w-64 flex-shrink-0 border-r border-border bg-card p-4 flex items-center font-semibold text-sm">
                        Issue Timeline
                    </div>
                    
                    {/* Right Scrollable Column (Days) */}
                    <div className="flex" style={{ width: totalDays * DAY_WIDTH }}>
                        {days.map((day, i) => (
                            <div 
                                key={i} 
                                className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-border/40 py-2
                                    ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted/30' : ''}`}
                                style={{ width: DAY_WIDTH }}
                            >
                                <span className="text-[10px] text-muted-foreground uppercase">{format(day, 'MMM d')}</span>
                                <span className={`text-xs font-medium mt-0.5 ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary text-primary-foreground rounded-full px-1.5 flex items-center justify-center' : ''}`}>
                                    {format(day, 'EEE')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline Body */}
                <div className="flex relative">
                    {/* Left Fixed Column (Project Groups + Items) */}
                    <div className="w-64 flex-shrink-0 border-r border-border bg-card/50 z-10">
                        {Object.entries(issuesByProject).map(([projectId, group]) => (
                            <div key={`group-${projectId}`}>
                                {/* Group Header */}
                                <div className="h-10 px-4 flex items-center bg-muted/50 border-b border-border/80 font-semibold text-xs tracking-wider uppercase text-muted-foreground">
                                    {group.projectName}
                                </div>
                                {/* Items */}
                                {group.items.map(issue => (
                                    <div key={`title-${issue.id}`} className="h-12 px-4 flex items-center border-b border-border/40 text-sm font-medium truncate shrink-0 hover:bg-muted/30 transition-colors">
                                        <div className="truncate w-full pr-2 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0
                                                ${issue.status === 'DONE' ? 'bg-green-500' : 
                                                  issue.status === 'BLOCKED' ? 'bg-red-500' : 
                                                  'bg-blue-500'}`} />
                                            {issue.title}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Right Data Grid */}
                    <div className="relative" style={{ width: totalDays * DAY_WIDTH }}>
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                            {days.map((day, i) => (
                                <div 
                                    key={`grid-${i}`} 
                                    className={`flex-shrink-0 border-r border-border/20 h-full
                                        ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted/10' : ''}
                                        ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary/5 border-primary/20' : ''}`}
                                    style={{ width: DAY_WIDTH }}
                                />
                            ))}
                        </div>

                        {/* Bars Layer */}
                        <div className="relative z-10 w-full">
                            {Object.entries(issuesByProject).map(([projectId, group]) => (
                                <div key={`grid-group-${projectId}`}>
                                    {/* Group Header Row Space */}
                                    <div className="h-10 w-full border-b border-border/40 bg-muted/10" />
                                    
                                    {/* Item Rows */}
                                    {group.items.map(issue => {
                                        // Calculate position and width by mapping GanttItem properties correctly
                                        const issueStart = issue.startDate ? new Date(issue.startDate) : new Date();
                                        const issueEnd = issue.dueDate ? new Date(issue.dueDate) : new Date(issueStart.getTime() + 14 * 24 * 60 * 60 * 1000);

                                        const startOffsetDays = differenceInDays(issueStart, startDate);
                                        const durationDays = Math.max(1, differenceInDays(issueEnd, issueStart) + 1);

                                        const left = startOffsetDays * DAY_WIDTH;
                                        const width = durationDays * DAY_WIDTH;
                                        
                                        // Demo intelligence: random risk coloring for certain demo elements for WOW impact
                                        const isDelayed = issue.title.toLowerCase().includes("mobile") || issue.title.toLowerCase().includes("payment");
                                        const hasRisk = issue.status === 'BLOCKED' || isDelayed;
                                        
                                        const barStyle = issue.status === 'DONE' 
                                            ? 'bg-green-500/20 text-green-700 border border-green-500/30' 
                                            : hasRisk
                                                ? 'bg-[#ffeb3b]/20 text-orange-700 border border-orange-500/50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,165,0,0.1)_10px,rgba(255,165,0,0.1)_20px)]' 
                                                : 'bg-blue-500/20 text-blue-700 border border-blue-500/30';

                                        return (
                                            <div key={`barrow-${issue.id}`} className="h-12 w-full border-b border-border/20 flex items-center relative hover:bg-muted/10 transition-colors group">
                                                <div 
                                                    className={`absolute h-8 rounded-md shadow-sm flex items-center px-2 text-xs font-medium cursor-pointer transition-all hover:ring-2 ring-primary/50 ${barStyle}`}
                                                    style={{ left: `${Math.max(0, left)}px`, width: `${Math.min(width, (totalDays * DAY_WIDTH) - left)}px` }}
                                                >
                                                    {hasRisk && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow animate-pulse">RISK</span>}
                                                    {issue.dependencies?.length > 0 && <span className="mr-1 text-[10px] opacity-70">🔗</span>}
                                                    <span className="truncate w-full">{issue.title}</span>
                                                    
                                                    {/* Hover Details Popover */}
                                                    <div className="absolute top-full left-0 mt-1 bg-card border border-border p-3 shadow-xl rounded-lg w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                                        <div className="font-bold mb-1 truncate flex items-center gap-2">
                                                            {issue.title}
                                                            {isDelayed && <span className="bg-red-500/10 text-red-500 px-1 py-0.5 text-[8px] rounded uppercase tracking-wider">Delayed</span>}
                                                        </div>
                                                        <div className="text-muted-foreground flex justify-between items-center mt-2 text-[11px]">
                                                            <span>Status:</span> <span className="font-mono bg-muted px-1 rounded">{issue.status}</span>
                                                        </div>
                                                        {issue.assigneeName && (
                                                            <div className="text-muted-foreground flex justify-between items-center mt-1 text-[11px]">
                                                                <span>Assignee:</span> <span className="font-medium text-foreground">{issue.assigneeName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

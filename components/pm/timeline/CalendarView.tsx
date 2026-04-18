"use client";

import React, { useMemo } from "react";
import { GanttItem } from "@/types/gantt";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from "date-fns";

interface CalendarViewProps {
    issues: GanttItem[];
}

export function CalendarView({ issues }: CalendarViewProps) {
    const today = new Date();
    
    // Simple calendar logic: display current month
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    const days = eachDayOfInterval({ start, end });

    // Group issues by dueDate
    const issuesByDate = useMemo(() => {
        const map = new Map<string, GanttItem[]>();
        issues.forEach(issue => {
            if (issue.dueDate) {
                const dateKey = format(new Date(issue.dueDate), "yyyy-MM-dd");
                const list = map.get(dateKey) || [];
                list.push(issue);
                map.set(dateKey, list);
            }
        });
        return map;
    }, [issues]);

    return (
        <div className="h-full w-full overflow-auto p-6 flex flex-col">
            <h3 className="text-lg font-bold mb-4">{format(today, "MMMM yyyy")}</h3>
            
            <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border flex-1 min-h-[600px]">
                {/* Weekday Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {day}
                    </div>
                ))}

                {/* Offset for first day of month */}
                {Array.from({ length: start.getDay() }).map((_, i) => (
                    <div key={`offset-${i}`} className="bg-background/50 p-2 min-h-[100px]" />
                ))}

                {/* Days */}
                {days.map(day => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayIssues = issuesByDate.get(dateKey) || [];
                    const isToday = isSameDay(day, today);

                    return (
                        <div key={dateKey} className={`bg-card p-2 min-h-[100px] border-b border-border transition-colors hover:bg-muted/10 relative ${isToday ? 'bg-primary/5' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                                    {format(day, "d")}
                                </span>
                                {dayIssues.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-full">{dayIssues.length}</span>
                                )}
                            </div>
                            
                            <div className="space-y-1 overflow-y-auto max-h-[120px] no-scrollbar">
                                {dayIssues.map(issue => (
                                    <div 
                                        key={issue.id} 
                                        className={`text-xs p-1.5 rounded border border-border/50 truncate cursor-pointer shadow-sm
                                            ${issue.status === 'DONE' ? 'bg-green-500/10 text-green-700 border-green-500/20' : 
                                              issue.status === 'BLOCKED' ? 'bg-red-500/10 text-red-700 border-red-500/20' : 
                                              'bg-background hover:border-primary/50 text-foreground'}`
                                        }
                                        title={issue.title}
                                    >
                                        {issue.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Offset for end of month */}
                {Array.from({ length: 6 - end.getDay() }).map((_, i) => (
                    <div key={`end-offset-${i}`} className="bg-background/50 p-2 min-h-[100px]" />
                ))}
            </div>
        </div>
    );
}

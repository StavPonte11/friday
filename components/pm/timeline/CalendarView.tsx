"use client";

import React, { useMemo, useState } from "react";
import { GanttItem } from "@/types/gantt";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface CalendarViewProps {
    issues: GanttItem[];
}

export function CalendarView({ issues }: CalendarViewProps) {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
    
    // Calendar logic
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Group issues by dates they cover
    const issuesByDate = useMemo(() => {
        const map = new Map<string, GanttItem[]>();
        issues.forEach(issue => {
            // Unify with Gantt logic: use startDate/dueDate
            let issueStart = issue.startDate ? new Date(issue.startDate) : new Date(today);
            let issueEnd = issue.dueDate ? new Date(issue.dueDate) : new Date(issueStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            // To prevent rendering over too many days, we just put it on start and end
            // Or better, we could fill every day but that could overload UI. 
            // We'll place it on all days in interval to match Gantt accurately!
            if (issueStart < start) issueStart = start; // clamp for this view
            if (issueEnd > end) issueEnd = end;
            
            if (issueStart <= issueEnd) {
                 const interval = eachDayOfInterval({ start: issueStart, end: issueEnd });
                 interval.forEach(day => {
                     const dateKey = format(day, "yyyy-MM-dd");
                     const list = map.get(dateKey) || [];
                     // prevent duplicates just in case
                     if (!list.find(i => i.id === issue.id)) {
                         list.push(issue);
                     }
                     map.set(dateKey, list);
                 });
            }
        });
        return map;
    }, [issues, start, end]);

    return (
        <div className="h-full w-full overflow-auto p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    {format(currentMonth, "MMMM yyyy")}
                </h3>
                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-background rounded-md transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setCurrentMonth(startOfMonth(today))} className="px-3 py-1.5 text-sm hover:bg-background rounded-md transition-colors font-medium">Today</button>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-background rounded-md transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
            
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
                                        className={`text-[10px] p-1 rounded border border-border/50 truncate cursor-pointer shadow-sm
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

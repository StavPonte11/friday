"use client";

import { useState, use } from "react";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/pm/EmptyState";
import { LoadingState } from "@/components/ui/loading-state";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendarPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = use(params);
    const { data: issues, isLoading } = trpc.pmIssues.listForCalendar.useQuery({ projectId });
    
    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());
    
    if (isLoading) return <LoadingState />;
    
    if (!issues || issues.length === 0) {
        return <EmptyState title="No Issues" description="Create issues with due dates to see them on the calendar." />;
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Always start on Sunday
    
    const days = [];
    const loopDate = new Date(startDate);
    while (loopDate <= lastDayOfMonth || days.length % 7 !== 0) {
        days.push(new Date(loopDate));
        loopDate.setDate(loopDate.getDate() + 1);
    }
    
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const today = () => setCurrentDate(new Date());

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Calendar View</h2>
                <div className="flex items-center space-x-4">
                    <span className="text-lg font-semibold w-40 text-center">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" onClick={today}>Today</Button>
                        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid grid-cols-7 gap-px bg-border border rounded-lg overflow-hidden">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="bg-muted p-2 font-semibold text-center text-sm text-muted-foreground">{d}</div>
                    ))}
                    
                    {days.map((date, i) => {
                        const dateString = date.toISOString().split('T')[0];
                        const dayIssues = issues.filter((issue: any) => issue.dueDate && new Date(issue.dueDate).toISOString().split('T')[0] === dateString);
                        const isCurrentMonth = date.getMonth() === month;
                        const isToday = dateString === new Date().toISOString().split('T')[0];
                        
                        return (
                            <div key={i} className={`min-h-[120px] p-2 bg-card ${!isCurrentMonth ? 'opacity-50' : ''}`}>
                                <span className={`text-xs font-medium w-7 h-7 flex items-center justify-center rounded-full mb-2 ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                                    {date.getDate()}
                                </span>
                                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[85px] pr-1">
                                    {dayIssues.map((issue: any) => (
                                        <div key={issue.id} className="text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2 py-1.5 rounded-md truncate cursor-default border border-border transition-colors" title={issue.title}>
                                            <span className="font-semibold mr-1">{issue.key}</span> {issue.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

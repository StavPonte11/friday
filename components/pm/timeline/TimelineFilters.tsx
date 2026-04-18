"use client";

import React, { useEffect, useState } from "react";
import { ViewFilter } from "@/types/gantt";
import { trpc } from "@/lib/trpc/client";
import { Filter, Users, LayoutDashboard, Flag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface TimelineFiltersProps {
    filters: ViewFilter;
    onFiltersChange: (newFilters: ViewFilter) => void;
}

const DEFAULT_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];

export function TimelineFilters({ filters, onFiltersChange }: TimelineFiltersProps) {
    const { data: projects } = trpc.pmProjects.list.useQuery();
    
    // We could fetch assigned users dynamically, but let's assume we can resolve them over time
    // For now, let's just use local state to manage open/close popovers if needed

    const updateFilter = (key: keyof ViewFilter, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const toggleArrayItem = (key: 'projectIds' | 'assigneeIds' | 'statuses', val: string) => {
        const current = filters[key] || [];
        if (current.includes(val)) {
            updateFilter(key, current.filter(v => v !== val));
        } else {
            updateFilter(key, [...current, val]);
        }
    };

    return (
        <div className="flex items-center gap-4 text-sm w-full">
            <div className="flex items-center gap-2 text-muted-foreground font-medium border-r border-border pr-4 mr-2">
                <Filter size={14} /> Filters
            </div>

            {/* Projects Filter */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed">
                        <LayoutDashboard size={14} />
                        Projects 
                        {(filters.projectIds?.length || 0) > 0 && (
                            <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                {filters.projectIds?.length}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Select Projects</h4>
                        {projects?.map(p => (
                            <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300"
                                    checked={(filters.projectIds || []).includes(p.id)}
                                    onChange={() => toggleArrayItem("projectIds", p.id)}
                                />
                                {p.name}
                            </label>
                        ))}
                        {(!projects || projects.length === 0) && (
                            <div className="text-xs text-muted-foreground px-2">No projects found.</div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Statuses Filter */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed">
                        <Flag size={14} />
                        Status
                        {(filters.statuses?.length || 0) > 0 && (
                            <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                {filters.statuses?.length}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                    <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Select Statuses</h4>
                        {DEFAULT_STATUSES.map(s => (
                            <label key={s} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300"
                                    checked={(filters.statuses || []).includes(s)}
                                    onChange={() => toggleArrayItem("statuses", s)}
                                />
                                {s.replace('_', ' ')}
                            </label>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Clear Filters (if active) */}
            {Object.keys(filters).length > 0 && Object.values(filters).some(v => v !== undefined && (!Array.isArray(v) || v.length > 0)) && (
                <Button variant="ghost" size="sm" onClick={() => onFiltersChange({})} className="h-8 text-muted-foreground text-xs ml-auto">
                    Clear all
                </Button>
            )}
        </div>
    );
}

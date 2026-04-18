"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { IntelligencePanel } from "@/components/pm/intelligence/IntelligencePanel";
import { Building, Brain } from "lucide-react";

export default function IntelligencePage() {
    const { data: projects, isLoading } = trpc.pmProjects.list.useQuery();
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");

    // Auto-select first project
    React.useEffect(() => {
        if (projects && projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Header */}
            <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-primary" />
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Project Intelligence</h2>
                        <p className="text-sm text-muted-foreground">AI-powered risk detection, delivery forecasts, and executive insights</p>
                    </div>
                </div>

                {/* Project Selector */}
                <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
                    <Building size={16} className="text-muted-foreground" />
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none w-44"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <option>Loading...</option>
                        ) : projects?.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {selectedProjectId ? (
                    <IntelligencePanel projectId={selectedProjectId} />
                ) : (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Select a project to view intelligence analysis.
                    </div>
                )}
            </div>
        </div>
    );
}

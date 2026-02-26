"use client";

import React from "react";
import { FileCode2, History, Plus } from "lucide-react";

// In a full implementation, this uses a trpc route fetching from Langfuse Prompts API
const DUMMY_PROMPTS = [
    { id: "generate-issue", version: 5, tags: ["prod"], model: "gpt-4o", updatedAt: "2026-02-25T10:00:00Z" },
    { id: "analyze-sprint", version: 2, tags: ["staging"], model: "claude-3-5-sonnet", updatedAt: "2026-02-24T14:30:00Z" },
];

export default function PromptsPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Prompt Manager</h2>
                    <p className="text-muted-foreground">Manage, version, and deploy AI prompts across workspaces.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                    <Plus size={16} /> New Prompt
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {DUMMY_PROMPTS.map((prompt) => (
                    <div key={prompt.id} className="border border-border rounded-lg bg-card p-5 hover:border-primary/50 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <FileCode2 className="text-primary" size={20} />
                                <h3 className="font-semibold text-lg">{prompt.id}</h3>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${prompt.tags.includes('prod') ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                v{prompt.version}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex justify-between">
                                <span>Model:</span>
                                <span className="font-mono text-foreground">{prompt.model}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Last updated:</span>
                                <div className="flex items-center gap-1">
                                    <History size={12} />
                                    <span>{new Date(prompt.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

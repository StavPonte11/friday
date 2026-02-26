"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft, Clock, Code, Database, Globe, Play, Server } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

export default function TraceDetailPage({ params }: { params: { id: string } }) {
    const locale = useLocale();
    const { data, isLoading, error } = trpc.traces.getTraces.useQuery({ sessionId: params.id, limit: 100 });
    const [selectedSpan, setSelectedSpan] = useState<any>(null);

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading trace execution...</div>;
    if (error) return <div className="p-8 text-center text-destructive">Error loading trace: {error.message}</div>;

    const traces = data?.data || [];

    // Flattening and processing LangFuse observations (mocking structure if traces array is empty or flat)
    const mockWaterfall = [
        { id: "1", name: "User Request", type: "event", startTime: 0, duration: 1200, depth: 0 },
        { id: "2", name: "Auth Check", type: "span", startTime: 10, duration: 40, depth: 1, parent: "1" },
        { id: "3", name: "DB Query User", type: "span", startTime: 50, duration: 200, depth: 2, parent: "2" },
        { id: "4", name: "Prompt Injection", type: "generation", startTime: 300, duration: 50, depth: 1, parent: "1" },
        { id: "5", name: "OpenAI GPT-4", type: "generation", startTime: 350, duration: 800, depth: 2, parent: "4", cost: 0.003, tokens: 154 },
        { id: "6", name: "Response Shaping", type: "span", startTime: 1150, duration: 50, depth: 1, parent: "1" },
    ];

    const displayList = traces.length > 0 ? traces : mockWaterfall;

    const getIcon = (type: string) => {
        switch (type) {
            case "generation": return <Globe size={14} className="text-purple-500" />;
            case "span": return <Code size={14} className="text-blue-500" />;
            case "event": return <Play size={14} className="text-green-500" />;
            default: return <Server size={14} className="text-muted-foreground" />;
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="mb-4">
                <Link href={`/${locale}/traces/sessions`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft size={16} /> Back to Sessions
                </Link>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                    Session Trace
                    <span className="text-sm font-mono font-normal bg-muted px-2 py-1 rounded-md text-muted-foreground">
                        {params.id}
                    </span>
                </h2>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Waterfall Pane */}
                <div className="flex-1 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
                    <div className="bg-muted px-4 py-2 border-b border-border flex text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <div className="w-1/2">Span / Event</div>
                        <div className="w-1/4">Duration</div>
                        <div className="w-1/4">Timeline</div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {displayList.map((span: any) => (
                            <div
                                key={span.id}
                                className={`flex px-4 py-2 hover:bg-muted/50 border-b border-border/50 cursor-pointer text-sm ${selectedSpan?.id === span.id ? 'bg-muted border-l-2 border-l-primary' : ''}`}
                                onClick={() => setSelectedSpan(span)}
                            >
                                <div className="w-1/2 flex items-center gap-2" style={{ paddingLeft: `${span.depth * 1.5}rem` }}>
                                    {getIcon(span.type)}
                                    <span className="font-medium truncate">{span.name}</span>
                                </div>
                                <div className="w-1/4 flex items-center gap-1 text-muted-foreground text-xs">
                                    <Clock size={12} /> {span.duration}ms
                                </div>
                                <div className="w-1/4 flex items-center">
                                    {/* Mock visual timeline bar */}
                                    <div className="w-full bg-secondary h-2 flex rounded overflow-hidden">
                                        <div className="h-full bg-transparent" style={{ width: `${(span.startTime / 1200) * 100}%` }}></div>
                                        <div className="h-full bg-primary" style={{ width: `${Math.max(1, (span.duration / 1200) * 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Details Pane */}
                <div className="w-96 border border-border rounded-lg bg-card overflow-y-auto">
                    {selectedSpan ? (
                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    {getIcon(selectedSpan.type)} {selectedSpan.name}
                                </h3>
                                <p className="text-xs text-muted-foreground font-mono mt-1">ID: {selectedSpan.id}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted p-3 rounded-md">
                                    <p className="text-xs text-muted-foreground">Type</p>
                                    <p className="font-medium capitalize">{selectedSpan.type}</p>
                                </div>
                                <div className="bg-muted p-3 rounded-md">
                                    <p className="text-xs text-muted-foreground">Duration</p>
                                    <p className="font-medium">{selectedSpan.duration}ms</p>
                                </div>
                            </div>

                            {selectedSpan.type === 'generation' && (
                                <>
                                    <div className="bg-muted p-3 rounded-md">
                                        <p className="text-xs text-muted-foreground">Tokens & Cost</p>
                                        <p className="font-medium">{selectedSpan.tokens} tokens • ${(selectedSpan.cost || 0).toFixed(4)}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Prompt Input</h4>
                                        <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap flex items-start gap-2">
                                            <Code size={14} className="mt-0.5 text-muted-foreground flex-shrink-0" />
                                            {`{"model": "gpt-4o", "messages": [{"role": "user", "content": "..."}]}`}
                                        </pre>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Generation Output</h4>
                                        <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
                                            {`"... response content ..."`}
                                        </pre>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                            <Database size={32} className="mb-4 opacity-20" />
                            <p>Select a span from the waterfall on the left to view detailed inputs, outputs, and metadata.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

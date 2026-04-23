"use client";

import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Activity, Target, Zap, AlertTriangle, Play, MessageSquare, ArrowRight, CheckCircle2, UserCircle2, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export function CommandCenter() {
    const { data: session } = useSession();
    const [actioning, setActioning] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [confidence, setConfidence] = useState(82);
    const [risks, setRisks] = useState([
        { id: "R1", title: "API Gateway Dependency", delay: "+3 Days", status: "Critical" },
        { id: "R2", title: "Mobile UI Polish", delay: "+1 Day", status: "Warning" }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch real project data
    const { data: projects } = trpc.pmProjects.list.useQuery(undefined, { staleTime: 30000 });
    const projectId = projects?.[0]?.id;
    const createIssueMutation = trpc.pmIssues.create.useMutation();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleQuickAction = async (id: string) => {
        if (!projectId) return;

        const userId = (session?.user as any)?.id || "admin@friday.local";

        setActioning(id);
        try {
            if (id === "R1" || id === "R2") {
                const risk = risks.find(r => r.id === id)!;
                await createIssueMutation.mutateAsync({
                    projectId,
                    title: `[Auto-Resolved] ${risk.title}`,
                    description: `Automatically generated mitigation task for risk: ${risk.title}`,
                    priority: id === "R1" ? "URGENT" : "HIGH",
                    status: "TODO",
                    creatorId: userId,
                });
                setRisks(prev => prev.filter(r => r.id !== id));
                setConfidence(prev => prev + (id === "R1" ? 12 : 3));
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `✅ Dispatched mitigation tasks for "${risk.title}". Sprint confidence updated. The blocker has been logged in your backlog.`
                }]);
            }
        } finally {
            setActioning(null);
        }
    };

    const handleChat = async () => {
        if (!chatInput.trim() || isChatLoading) return;
        const query = chatInput.trim();
        setChatInput("");
        setMessages(prev => [...prev, { role: 'user', content: query }]);
        setIsChatLoading(true);

        try {
            const res = await fetch("/api/pm/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: query, projectId }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? "No response." }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Could not reach AI copilot. Is Ollama running?" }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="flex gap-6 max-h-[85vh] h-full">
            {/* LEFT COLUMN: Insights & Dashboard */}
            <div className="flex-1 space-y-6 overflow-y-auto pr-2 pb-10">
                <div className="mb-6">
                    <h2 className="text-3xl font-black tracking-tight">Command Center</h2>
                    <p className="text-muted-foreground mt-1">Real-time predictive telemetry & intelligence.</p>
                </div>

                {/* Core KPIs */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 hover:from-blue-500/20 transition-all border border-blue-500/20">
                        <div className="flex justify-between items-start mb-2">
                            <Target size={18} className="text-blue-500" />
                            <span className="text-xs font-semibold px-2 py-1 bg-blue-500/20 text-blue-600 rounded-full">On Track</span>
                        </div>
                        <h4 className="text-sm font-medium text-muted-foreground">Delivery Prediction</h4>
                        <p className="text-2xl font-bold mt-1">Nov 18</p>
                    </div>

                    <div className={`p-5 rounded-2xl transition-all border ${confidence > 90 ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20 hover:from-green-500/20' : 'bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/20 hover:from-orange-500/20'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <Activity size={18} className={confidence > 90 ? "text-green-500" : "text-orange-500"} />
                            <span className="text-xs font-semibold px-2 py-1 bg-foreground/10 rounded-full">{confidence > 90 ? '+12%' : '-5%'}</span>
                        </div>
                        <h4 className="text-sm font-medium text-muted-foreground">Sprint Confidence</h4>
                        <p className="text-2xl font-bold mt-1 tabular-nums">{confidence}%</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 hover:from-purple-500/20 transition-all border border-purple-500/20">
                        <div className="flex justify-between items-start mb-2">
                            <Zap size={18} className="text-purple-500" />
                            <span className="text-xs font-semibold text-purple-500">+1 Overage</span>
                        </div>
                        <h4 className="text-sm font-medium text-muted-foreground">Team Load</h4>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map(i => <div key={i} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px]"><UserCircle2 size={12} /></div>)}
                            </div>
                            <span className="text-sm font-bold">92% Cap</span>
                        </div>
                    </div>
                </div>

                {/* Active Projects summary */}
                {projects && projects.length > 0 && (
                    <div>
                        <h3 className="text-base font-semibold mb-3 text-muted-foreground">Active Projects</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {projects.slice(0, 4).map((p: any) => (
                                <div key={p.id} className="p-3 rounded-xl border border-border bg-card flex items-center gap-3 hover:border-primary/30 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{p.key.slice(0, 3)}</div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.key}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Insight to Action */}
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><AlertTriangle className="text-orange-500" size={18} /> Active Risks & Intelligence</h3>
                    <div className="space-y-3">
                        {risks.map((risk) => (
                            <div key={risk.id} className="p-4 rounded-xl border border-border bg-card flex items-center justify-between shadow-sm group hover:border-orange-500/40 transition-colors">
                                <div>
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        {risk.title}
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${risk.status === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>{risk.status}</span>
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1">Predicted Delay: <span className="text-orange-500 font-medium">{risk.delay}</span></p>
                                </div>
                                <Button
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary hover:bg-primary/90 text-xs gap-2"
                                    onClick={() => handleQuickAction(risk.id)}
                                    disabled={actioning === risk.id}
                                >
                                    {actioning === risk.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                                    Resolve Automatically
                                </Button>
                            </div>
                        ))}
                        {risks.length === 0 && (
                            <div className="p-8 text-center border border-dashed border-green-500/30 rounded-xl bg-green-500/5">
                                <CheckCircle2 size={24} className="mx-auto text-green-500 mb-2" />
                                <p className="text-sm font-medium">All active risks resolved.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Copilot */}
            <div className="w-[380px] flex flex-col bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles size={16} className="text-primary" /> Friday AI Copilot</h3>
                    <p className="text-xs text-muted-foreground">Ask about your projects, risks, or run simulations.</p>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.length === 0 && (
                        <div className="text-xs text-center pb-4 space-y-2">
                            <p className="text-muted-foreground">Try asking:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {["What is at risk?", "Which issues are overdue?", "Who is overloaded?", "Summarize sprint health"].map(q => (
                                    <button key={q} onClick={() => setChatInput(q)} className="text-primary hover:underline font-medium text-xs border border-primary/20 rounded-full px-2 py-1 hover:bg-primary/5 transition-colors">
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-2xl max-w-[88%] text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {isChatLoading && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl rounded-tl-sm p-3 flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 size={12} className="animate-spin" /> Thinking...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-border bg-background">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            className="w-full pl-9 pr-10 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/70"
                            placeholder="Ask anything about your projects..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
                        />
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-primary-foreground rounded-md hover:scale-105 transition-transform disabled:opacity-50"
                            onClick={handleChat}
                            disabled={isChatLoading || !chatInput.trim()}
                        >
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

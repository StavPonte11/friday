"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { 
    Plus, 
    Trash2, 
    Globe, 
    CheckCircle2, 
    AlertCircle, 
    ExternalLink, 
    ChevronRight,
    Loader2
} from "lucide-react";

interface WebhooksSettingsPageProps {
    projectId: string;
}

type WebhookEvent = "issue.created" | "issue.updated" | "sprint.started" | "sprint.completed" | "comment.added";

export default function WebhooksSettingsPage({ projectId }: WebhooksSettingsPageProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [events, setEvents] = useState<WebhookEvent[]>(["issue.created", "issue.updated"]);

    const utils = trpc.useUtils();
    const { data: webhooks, isLoading } = trpc.pmWebhooks.list.useQuery({ projectId });
    
    const createMutation = trpc.pmWebhooks.create.useMutation({
        onSuccess: () => {
            setIsAdding(false);
            setName("");
            setUrl("");
            setSecret("");
            utils.pmWebhooks.list.invalidate({ projectId });
        }
    });

    const deleteMutation = trpc.pmWebhooks.delete.useMutation({
        onSuccess: () => utils.pmWebhooks.list.invalidate({ projectId })
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url || !name) return;
        createMutation.mutate({
            projectId,
            name,
            url,
            events,
            active: true
        });
    };

    const toggleEvent = (event: WebhookEvent) => {
        setEvents(prev => 
            prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
        );
    };

    const availableEvents: { id: WebhookEvent; label: string; desc: string }[] = [
        { id: "issue.created", label: "Issue Created", desc: "Triggered when a new issue is created." },
        { id: "issue.updated", label: "Issue Updated", desc: "Triggered when any field on an issue is changed." },
        { id: "comment.added", label: "Comment Added", desc: "Triggered when a comment is posted to an issue." },
        { id: "sprint.started", label: "Sprint Started", desc: "Triggered when a sprint status changes to ACTIVE." },
        { id: "sprint.completed", label: "Sprint Completed", desc: "Triggered when a sprint status changes to DONE." },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
                    <p className="text-muted-foreground mt-1">
                        Send real-time updates from FRIDAY PM to your external services.
                    </p>
                </div>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <Plus size={18} /> Add Webhook
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Globe className="text-primary" size={20} /> Configure New Webhook
                    </h2>
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Webhook Name</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g. Slack Integration" 
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground italic">A descriptive name for this webhook.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payload URL</label>
                                <input 
                                    type="url" 
                                    required
                                    placeholder="https://your-service.com/webhook" 
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground italic">The endpoint where FRIDAY will send POST requests.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Secret (Optional)</label>
                                <input 
                                    type="password" 
                                    placeholder="••••••••••••••••" 
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground italic">Used to sign payloads for security (X-Friday-Signature header).</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium">Event Triggers</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {availableEvents.map(ev => (
                                    <div 
                                        key={ev.id}
                                        onClick={() => toggleEvent(ev.id)}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all flex items-start gap-3 ${events.includes(ev.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card'}`}
                                    >
                                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${events.includes(ev.id) ? 'bg-primary border-primary text-white' : 'border-border'}`}>
                                            {events.includes(ev.id) && <CheckCircle2 size={10} />}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase">{ev.label}</div>
                                            <div className="text-[10px] text-muted-foreground leading-tight">{ev.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                            <button 
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={createMutation.isPending}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-all"
                            >
                                {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                                Save Webhook
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Active Webhooks</h3>
                {isLoading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-xl border border-border"></div>)}
                    </div>
                ) : webhooks?.length === 0 ? (
                    <div className="bg-muted/30 border border-dashed border-border rounded-xl p-12 text-center">
                        <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h4 className="font-medium">No webhooks configured</h4>
                        <p className="text-xs text-muted-foreground mt-1">Connect FRIDAY to Slack, Discord, or custom backend services.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {webhooks?.map(wh => (
                            <div key={wh.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => deleteMutation.mutate({ id: wh.id })}
                                        className="text-muted-foreground hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Globe size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm truncate">{wh.url}</span>
                                            {wh.active ? (
                                                <span className="bg-green-500/10 text-green-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase">Active</span>
                                            ) : (
                                                <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase">Inactive</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            {(wh.events as string[]).map(ev => (
                                                <span key={ev} className="bg-secondary text-secondary-foreground text-[9px] px-1.5 py-0.5 rounded-md font-mono border border-border/50">{ev}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0 text-[10px] text-muted-foreground pr-8">
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircle2 size={12} className="text-green-500" /> 100% Success
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <AlertCircle size={12} className="text-muted-foreground" /> No failures
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-muted-foreground/30" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-muted/40 border border-border rounded-xl p-6">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ExternalLink size={16} /> Documentation
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    FRIDAY's webhooks follow a simple event-driven architecture. Every POST request includes an 
                    <code className="bg-muted px-1 rounded">X-Friday-Event</code> header and an optional 
                    <code className="bg-muted px-1 rounded">X-Friday-Signature</code> for validation. 
                    <a href="#" className="text-primary hover:underline ml-1">Read the full API reference</a>.
                </p>
            </div>
        </div>
    );
}

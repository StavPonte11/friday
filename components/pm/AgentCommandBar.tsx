"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { trpc } from "@/lib/trpc/client";
import { Bot, Send, Loader2, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface AgentCommandBarProps {
    projectId: string;
    className?: string;
}

export function AgentCommandBar({ projectId, className }: AgentCommandBarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [isPending, startTransition] = useTransition();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const runAgent = trpc.pmAgent.runAgent.useMutation({
        onSuccess: (data: { output: string }) => {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: data.output,
                timestamp: new Date()
            }]);
        },
        onError: (err) => {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `⚠️ Agent error: ${err.message}`,
                timestamp: new Date()
            }]);
        }
    });

    const handleSubmit = () => {
        const trimmed = input.trim();
        if (!trimmed || runAgent.isPending) return;

        const userMessage: AgentMessage = {
            role: "user",
            content: trimmed,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");

        startTransition(() => {
            runAgent.mutate({ projectId, input: trimmed });
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    return (
        <div className={cn("fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3", className)}>
            {/* Expanded Panel */}
            {isOpen && (
                <div className="w-[420px] max-h-[600px] flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles size={14} className="text-primary" />
                            </div>
                            <span className="font-semibold text-sm">F.R.I.D.A.Y Agent</span>
                            <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">ReAct</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 0 && (
                                <button
                                    onClick={() => setMessages([])}
                                    className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                    title="Clear conversation"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Bot size={22} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">F.R.I.D.A.Y is ready</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                                        Ask me to assign issues, update statuses, create subtasks, or analyse your project.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center mt-2">
                                    {[
                                        "Assign open issues to team",
                                        "Create subtasks for EPIC-1",
                                        "What are the blockers?"
                                    ].map(suggestion => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setInput(suggestion)}
                                            className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex gap-2",
                                        msg.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {msg.role === "assistant" && (
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Bot size={12} className="text-primary" />
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            "max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-muted text-foreground rounded-tl-sm"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Agent thinking indicator */}
                        {runAgent.isPending && (
                            <div className="flex gap-2 justify-start">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Bot size={12} className="text-primary" />
                                </div>
                                <div className="bg-muted px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2">
                                    <Loader2 size={12} className="animate-spin text-primary" />
                                    <span className="text-xs text-muted-foreground">Thinking...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-border p-3">
                        <div className="flex items-end gap-2 bg-muted rounded-xl px-3 py-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Tell FRIDAY what to do..."
                                rows={1}
                                className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground max-h-[100px] leading-relaxed"
                                style={{ minHeight: "20px" }}
                                disabled={runAgent.isPending}
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={!input.trim() || runAgent.isPending}
                                className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors"
                            >
                                {runAgent.isPending ? (
                                    <Loader2 size={13} className="animate-spin text-primary-foreground" />
                                ) : (
                                    <Send size={13} className="text-primary-foreground" />
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                            Enter to send · Shift+Enter for new line
                        </p>
                    </div>
                </div>
            )}

            {/* FAB Toggle Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className={cn(
                    "group w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
                    "bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95",
                    isOpen && "rotate-0"
                )}
                aria-label="Toggle FRIDAY Agent"
            >
                {isOpen ? (
                    <ChevronDown size={22} className="text-primary-foreground" />
                ) : (
                    <div className="relative">
                        <Bot size={22} className="text-primary-foreground" />
                        {/* Pulse ring when closed */}
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-primary" />
                    </div>
                )}
            </button>
        </div>
    );
}

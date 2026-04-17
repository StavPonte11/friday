"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Bot, ChevronDown, Check, Cpu, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDER_OPTIONS = [
    {
        id: "openai",
        label: "OpenAI GPT-4o",
        description: "Best reasoning, cloud-hosted",
        icon: <Globe size={14} />,
        badge: "Cloud",
        badgeColor: "text-blue-500 bg-blue-500/10"
    },
    {
        id: "azure",
        label: "Azure OpenAI",
        description: "Enterprise-grade, compliant",
        icon: <Globe size={14} />,
        badge: "Cloud",
        badgeColor: "text-sky-500 bg-sky-500/10"
    },
    {
        id: "ollama",
        label: "Ollama (local)",
        description: "On-prem, air-gapped, private",
        icon: <Cpu size={14} />,
        badge: "On-Prem",
        badgeColor: "text-green-500 bg-green-500/10"
    },
    {
        id: "custom",
        label: "Custom Endpoint",
        description: "Any OpenAI-compatible API",
        icon: <Bot size={14} />,
        badge: "Custom",
        badgeColor: "text-purple-500 bg-purple-500/10"
    }
] as const;

type ProviderId = typeof PROVIDER_OPTIONS[number]["id"];

interface AIProviderSelectorProps {
    projectId: string;
    currentProvider?: ProviderId;
    className?: string;
}

export function AIProviderSelector({ projectId, currentProvider = "openai", className }: AIProviderSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<ProviderId>(currentProvider);
    const [isSaving, setIsSaving] = useState(false);

    const handleSelect = async (provider: ProviderId) => {
        setSelected(provider);
        setIsSaving(true);
        // TODO: persist via workspace module config mutation when available
        // For now, selection is applied in-memory and can be read from
        // a React context or persisted to localStorage.
        await new Promise(r => setTimeout(r, 200)); // UX feedback delay
        setIsSaving(false);
        setIsOpen(false);
    };

    const current = PROVIDER_OPTIONS.find(p => p.id === selected) ?? PROVIDER_OPTIONS[0];

    return (
        <div className={cn("relative", className)}>
            {/* Trigger */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm"
                aria-label="Select AI Provider"
            >
                <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    {current.icon}
                </div>
                <span className="font-medium text-foreground">{current.label}</span>
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", current.badgeColor)}>
                    {current.badge}
                </span>
                {isSaving
                    ? <Loader2 size={13} className="animate-spin text-primary ml-1" />
                    : <ChevronDown size={13} className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                }
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full mt-1.5 right-0 z-50 w-72 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-3 py-2 border-b border-border">
                            <p className="text-xs font-semibold text-foreground">AI Provider</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Per-project model selection</p>
                        </div>

                        <ul className="py-1">
                            {PROVIDER_OPTIONS.map(option => (
                                <li key={option.id}>
                                    <button
                                        onClick={() => handleSelect(option.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                                            selected === option.id ? "bg-primary/8" : "hover:bg-muted/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                                            selected === option.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            {option.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-medium text-foreground">{option.label}</p>
                                                <span className={cn("text-[10px] font-semibold px-1 py-0.5 rounded-full flex-shrink-0", option.badgeColor)}>
                                                    {option.badge}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{option.description}</p>
                                        </div>
                                        {selected === option.id && (
                                            <Check size={14} className="text-primary flex-shrink-0" />
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className="px-3 py-2 border-t border-border bg-muted/20">
                            <p className="text-[10px] text-muted-foreground">
                                Configure endpoints in <span className="font-mono">.env</span> · LLM_URL / LLM_API_KEY
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

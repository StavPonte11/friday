"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Sparkles, Loader2, CheckCircle, Calendar, Target, ArrowRight, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Priority colours ─────────────────────────────────────────────────────────
const PRIORITY_STYLE: Record<string, string> = {
    URGENT: "text-red-500 bg-red-500/10",
    HIGH:   "text-orange-500 bg-orange-500/10",
    MEDIUM: "text-yellow-500 bg-yellow-500/10",
    LOW:    "text-blue-400 bg-blue-400/10",
    NONE:   "text-muted-foreground bg-muted/40",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface SprintPlanningPanelProps {
    projectId: string;
    onApplied?: () => void;
    className?: string;
}

type PlanIssue = {
    id: string;
    key: string;
    title: string;
    priority: string;
    storyPoints: number | null;
    complexityScore?: number | null;
};

type Plan = {
    issues: PlanIssue[];
    reasoning: string;
    estimatedVelocity: number;
};

export function SprintPlanningPanel({ projectId, onApplied, className }: SprintPlanningPanelProps) {
    const [velocity, setVelocity] = useState(30);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [step, setStep] = useState<"idle" | "planning" | "reviewing" | "naming" | "done">("idle");
    const [sprintName, setSprintName] = useState(`Sprint ${new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`);
    const [sprintGoal, setSprintGoal] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState("");

    const recommendMutation = trpc.pmSprints.recommendPlan.useMutation({
        onSuccess: (data) => {
            const p = data as unknown as Plan;
            setPlan(p);
            setSelectedIds(new Set(p.issues.map((i) => i.id)));
            setStep("reviewing");
        },
        onError: (err) => {
            setError(err.message);
            setStep("idle");
        }
    });

    const applyMutation = trpc.pmSprints.applyPlan.useMutation({
        onSuccess: () => {
            setStep("done");
            onApplied?.();
        },
        onError: (err) => setError(err.message),
    });

    const utils = trpc.useUtils();

    function handleRecommend() {
        setError("");
        setStep("planning");
        setPlan(null);
        recommendMutation.mutate({ projectId, targetVelocity: velocity });
    }

    function toggleIssue(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function handleApply() {
        if (selectedIds.size === 0) { setError("Select at least one issue."); return; }
        setStep("naming");
    }

    function handleConfirm() {
        applyMutation.mutate({
            projectId,
            name: sprintName,
            goal: sprintGoal || undefined,
            issueIds: [...selectedIds],
        });
    }

    const totalPoints = plan?.issues
        .filter(i => selectedIds.has(i.id))
        .reduce((s, i) => s + (i.storyPoints ?? 0), 0) ?? 0;

    return (
        <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-violet-500/5 to-transparent">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Sparkles size={16} className="text-violet-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">AI Sprint Planning</h3>
                        <p className="text-[11px] text-muted-foreground">One-click sprint from backlog</p>
                    </div>
                </div>
                {step !== "idle" && step !== "planning" && (
                    <button
                        onClick={() => { setStep("idle"); setPlan(null); setSelectedIds(new Set()); setError(""); }}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                        <RefreshCw size={11} /> Reset
                    </button>
                )}
            </div>

            <div className="p-5 space-y-4">
                {/* Error */}
                {error && (
                    <div className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
                )}

                {/* Step: Idle */}
                {step === "idle" && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Target Velocity (story points)</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range" min={10} max={100} step={5} value={velocity}
                                    onChange={e => setVelocity(Number(e.target.value))}
                                    className="flex-1 accent-violet-500"
                                />
                                <span className="text-sm font-bold w-8 text-center">{velocity}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleRecommend}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                        >
                            <Sparkles size={14} /> Generate Sprint Plan
                        </button>
                    </div>
                )}

                {/* Step: Planning */}
                {step === "planning" && (
                    <div className="flex flex-col items-center gap-3 py-8">
                        <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                            <Loader2 size={20} className="animate-spin text-violet-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">Analyzing backlog…</p>
                            <p className="text-xs text-muted-foreground mt-1">AI is selecting the best issues for velocity {velocity}</p>
                        </div>
                    </div>
                )}

                {/* Step: Reviewing */}
                {step === "reviewing" && plan && (
                    <div className="space-y-4">
                        {/* Reasoning */}
                        <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3 border border-border leading-relaxed">
                            <span className="font-semibold text-foreground">AI Reasoning: </span>
                            {plan.reasoning}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: "Issues", value: plan.issues.length, icon: Target },
                                { label: "Selected", value: selectedIds.size, icon: CheckCircle },
                                { label: "Points", value: totalPoints, icon: Zap },
                            ].map(s => (
                                <div key={s.label} className="rounded-xl bg-muted/40 p-2 text-center">
                                    <s.icon size={14} className="mx-auto mb-1 text-muted-foreground" />
                                    <div className="text-lg font-bold">{s.value}</div>
                                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Issue list */}
                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                            {plan.issues.map(issue => (
                                <label
                                    key={issue.id}
                                    className={cn(
                                        "flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all",
                                        selectedIds.has(issue.id)
                                            ? "border-violet-500/40 bg-violet-500/5"
                                            : "border-border bg-muted/20 opacity-60"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(issue.id)}
                                        onChange={() => toggleIssue(issue.id)}
                                        className="accent-violet-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-mono text-muted-foreground">{issue.key}</span>
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", PRIORITY_STYLE[issue.priority])}>
                                                {issue.priority}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium truncate">{issue.title}</p>
                                    </div>
                                    {issue.storyPoints != null && (
                                        <span className="text-xs font-bold text-violet-400 flex-shrink-0">{issue.storyPoints}pt</span>
                                    )}
                                </label>
                            ))}
                        </div>

                        <button
                            onClick={handleApply}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                        >
                            Apply Plan <ArrowRight size={14} />
                        </button>
                    </div>
                )}

                {/* Step: Naming */}
                {step === "naming" && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Name your sprint</h4>
                        <input
                            value={sprintName}
                            onChange={e => setSprintName(e.target.value)}
                            placeholder="Sprint name"
                            className="w-full text-sm px-3 py-2 rounded-xl bg-muted/40 border border-border outline-none focus:ring-1 focus:ring-violet-500"
                        />
                        <input
                            value={sprintGoal}
                            onChange={e => setSprintGoal(e.target.value)}
                            placeholder="Sprint goal (optional)"
                            className="w-full text-sm px-3 py-2 rounded-xl bg-muted/40 border border-border outline-none focus:ring-1 focus:ring-violet-500"
                        />

                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-2.5">
                            <Calendar size={12} />
                            Creating sprint with <strong>{selectedIds.size} issues</strong> • <strong>{totalPoints} pts</strong>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={!sprintName.trim() || applyMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                        >
                            {applyMutation.isPending
                                ? <Loader2 className="animate-spin" size={14} />
                                : <><CheckCircle size={14} /> Create Sprint</>
                            }
                        </button>
                    </div>
                )}

                {/* Step: Done */}
                {step === "done" && (
                    <div className="flex flex-col items-center gap-3 py-6">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                            <CheckCircle size={24} className="text-green-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold">Sprint created!</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                "{sprintName}" is ready with {selectedIds.size} issues.
                            </p>
                        </div>
                        <button
                            onClick={() => { setStep("idle"); setPlan(null); setSelectedIds(new Set()); }}
                            className="text-xs text-violet-500 hover:underline"
                        >
                            Plan another sprint
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

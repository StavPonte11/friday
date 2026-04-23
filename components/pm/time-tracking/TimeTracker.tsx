"use client";

import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Clock, Play, Square, Trash2, Plus, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function minutesToHuman(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function humanToMinutes(input: string): number | null {
    // Accepts: "1h 30m", "90m", "1.5h", "30"
    const trimmed = input.trim().toLowerCase();
    
    // Pattern: Xh Ym
    const hm = trimmed.match(/^(\d+\.?\d*)h\s*(\d+)m$/);
    if (hm) return Math.round(parseFloat(hm[1]) * 60) + parseInt(hm[2]);
    
    // Pattern: Xh
    const h = trimmed.match(/^(\d+\.?\d*)h$/);
    if (h) return Math.round(parseFloat(h[1]) * 60);
    
    // Pattern: Xm
    const m = trimmed.match(/^(\d+)m?$/);
    if (m) return parseInt(m[1]);
    
    return null;
}

// ─── Active timer (client-only stopwatch) ─────────────────────────────────────
function useStopwatch() {
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0); // seconds
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [running]);

    const start = () => setRunning(true);
    const stop = () => { setRunning(false); return Math.max(1, Math.ceil(elapsed / 60)); }; // return minutes
    const reset = () => { setRunning(false); setElapsed(0); };

    const display = (() => {
        const h = Math.floor(elapsed / 3600).toString().padStart(2, "0");
        const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0");
        const s = (elapsed % 60).toString().padStart(2, "0");
        return `${h}:${m}:${s}`;
    })();

    return { running, display, start, stop, reset, elapsedSeconds: elapsed };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TimeTrackerProps {
    issueId: string;
    userId: string;
    originalEstimate?: number | null;
    timeSpent?: number | null;
    className?: string;
}

export function TimeTracker({ issueId, userId, originalEstimate, timeSpent: initialSpent, className }: TimeTrackerProps) {
    const [manualInput, setManualInput] = useState("");
    const [note, setNote] = useState("");
    const [manualError, setManualError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const stopwatch = useStopwatch();

    const utils = trpc.useUtils();
    const { data: logs = [], isLoading } = trpc.pmTimeTracking.listByIssue.useQuery({ issueId });

    const logMutation = trpc.pmTimeTracking.log.useMutation({
        onSuccess: () => {
            utils.pmTimeTracking.listByIssue.invalidate({ issueId });
            setManualInput("");
            setNote("");
            setShowForm(false);
        }
    });

    const deleteMutation = trpc.pmTimeTracking.delete.useMutation({
        onSuccess: () => utils.pmTimeTracking.listByIssue.invalidate({ issueId })
    });

    const totalLogged = logs.reduce((sum, l) => sum + l.minutes, 0);
    const estimate = originalEstimate ?? 0;
    const pct = estimate > 0 ? Math.min(100, Math.round((totalLogged / estimate) * 100)) : null;

    function handleStopAndLog() {
        const minutes = stopwatch.stop();
        stopwatch.reset();
        logMutation.mutate({ issueId, userId, minutes, note: "Timer" });
    }

    function handleManualLog() {
        const minutes = humanToMinutes(manualInput);
        if (!minutes || minutes <= 0) {
            setManualError("Invalid format. Try '1h 30m', '90m', or '2h'.");
            return;
        }
        setManualError("");
        logMutation.mutate({ issueId, userId, minutes, note: note || undefined });
    }

    return (
        <div className={cn("space-y-3", className)}>
            {/* Header + timer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    <span className="text-sm font-semibold">Time Tracking</span>
                </div>

                {/* Stopwatch */}
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "font-mono text-sm px-2 py-0.5 rounded bg-muted/60",
                        stopwatch.running && "text-green-500 animate-pulse"
                    )}>
                        {stopwatch.display}
                    </span>
                    {stopwatch.running ? (
                        <button
                            onClick={handleStopAndLog}
                            className="p-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                            title="Stop & log time"
                        >
                            <Square size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={stopwatch.start}
                            className="p-1 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                            title="Start timer"
                        >
                            <Play size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            {estimate > 0 && (
                <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Logged: {minutesToHuman(totalLogged)}</span>
                        <span>Estimate: {minutesToHuman(estimate)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                (pct ?? 0) >= 100 ? "bg-red-500" : (pct ?? 0) >= 80 ? "bg-amber-500" : "bg-green-500"
                            )}
                            style={{ width: `${pct ?? 0}%` }}
                        />
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground mt-0.5">{pct ?? 0}% used</div>
                </div>
            )}

            {/* Manual log form toggle */}
            <button
                onClick={() => setShowForm(p => !p)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-dashed border-border hover:bg-muted/40 text-muted-foreground transition-colors"
            >
                <Plus size={12} /> Log Time Manually
            </button>

            {showForm && (
                <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border">
                    <input
                        value={manualInput}
                        onChange={e => { setManualInput(e.target.value); setManualError(""); }}
                        placeholder="e.g. 1h 30m, 90m, 2h"
                        className="w-full text-sm px-3 py-1.5 rounded-lg bg-background border border-border outline-none focus:ring-1 focus:ring-primary"
                    />
                    {manualError && <p className="text-xs text-red-500">{manualError}</p>}
                    <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="w-full text-sm px-3 py-1.5 rounded-lg bg-background border border-border outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                        onClick={handleManualLog}
                        disabled={logMutation.isPending}
                        className="w-full text-xs font-medium py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {logMutation.isPending ? <Loader2 className="animate-spin mx-auto" size={13} /> : "Log Time"}
                    </button>
                </div>
            )}

            {/* Logs list */}
            {isLoading ? (
                <div className="flex justify-center py-2"><Loader2 size={14} className="animate-spin text-muted-foreground" /></div>
            ) : logs.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {logs.map(log => (
                        <div key={log.id} className="flex items-start gap-2 group text-xs">
                            <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {log.user?.image
                                    ? <img src={log.user.image} alt={log.user.name ?? ""} className="w-full h-full object-cover" />
                                    : <span className="text-[10px] font-bold">{log.user?.name?.[0] ?? "?"}</span>
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center gap-1">
                                    <span className="font-medium">{log.user?.name ?? "Unknown"}</span>
                                    <span className="font-mono text-muted-foreground">{minutesToHuman(log.minutes)}</span>
                                </div>
                                {log.note && <p className="text-muted-foreground truncate">{log.note}</p>}
                                <p className="text-muted-foreground/60 text-[10px]">
                                    {new Date(log.loggedAt).toLocaleDateString()}
                                </p>
                            </div>
                            {log.userId === userId && (
                                <button
                                    onClick={() => deleteMutation.mutate({ id: log.id, requesterId: userId })}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={11} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

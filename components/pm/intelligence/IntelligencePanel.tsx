"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
    AlertTriangle,
    Brain,
    TrendingUp,
    ShieldAlert,
    Lightbulb,
    Loader2,
    CheckCircle2,
    RefreshCw,
    Play,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Risk, Insight } from "@/lib/ai/project-intelligence";
import { useSession } from "next-auth/react";

interface IntelligencePanelProps {
    projectId: string;
    sprintId?: string;
}

const SEVERITY_STYLE: Record<string, string> = {
    high: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400",
    medium: "border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-400",
    low: "border-yellow-500/30 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400",
};

const INSIGHT_ICON: Record<string, React.ReactNode> = {
    performance: <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />,
    risk: <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />,
    optimization: <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />,
};

function RiskCard({ risk, onAction, isActioning, resolved }: {
    risk: Risk;
    onAction: (risk: Risk) => void;
    isActioning: boolean;
    resolved: boolean;
}) {
    return (
        <div className={`border rounded-lg p-4 space-y-2 transition-all ${resolved ? 'opacity-50 bg-muted/20 border-green-500/30' : SEVERITY_STYLE[risk.severity]}`}>
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug flex items-center gap-2">
                    {resolved && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {risk.title}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEVERITY_STYLE[risk.severity]}`}>
                        {risk.severity}
                    </span>
                    {!resolved && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                            onClick={() => onAction(risk)}
                            disabled={isActioning}
                        >
                            {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" fill="currentColor" />}
                            {isActioning ? "Creating..." : "Auto-Resolve"}
                        </Button>
                    )}
                </div>
            </div>
            <p className="text-xs text-muted-foreground">{risk.description}</p>
            <div className="pt-1 border-t border-current/10">
                <p className="text-xs font-medium">💡 {risk.recommendation}</p>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Root cause: {risk.rootCause}</span>
                <span>Confidence: {Math.round(risk.confidence * 100)}%</span>
            </div>
        </div>
    );
}

function InsightCard({ insight }: { insight: Insight }) {
    return (
        <div className="border border-border rounded-lg p-4 space-y-2 bg-card hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-2">
                {INSIGHT_ICON[insight.type]}
                <p className="text-sm font-medium leading-snug">{insight.message}</p>
            </div>
            <p className="text-xs text-muted-foreground pl-6">Impact: {insight.impact}</p>
            <p className="text-xs font-medium text-primary pl-6">→ {insight.recommendation}</p>
            <div className="pl-6 text-[10px] text-muted-foreground">
                Confidence: {Math.round(insight.confidence * 100)}%
            </div>
        </div>
    );
}

export function IntelligencePanel({ projectId, sprintId }: IntelligencePanelProps) {
    const { data: session } = useSession();
    const [actioningRiskId, setActioningRiskId] = useState<string | null>(null);
    const [resolvedRiskIds, setResolvedRiskIds] = useState<Set<string>>(new Set());
    const [toasts, setToasts] = useState<{ id: string; message: React.ReactNode }[]>([]);

    const createIssueMutation = trpc.pmIssues.create.useMutation();

    const addToast = (message: React.ReactNode) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(t => [...t, { id, message }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000);
    };

    const handleRiskAction = async (risk: Risk) => {
        const userId = (session?.user as any)?.id || "admin@friday.local";

        setActioningRiskId(risk.id);
        try {
            const newIssue = await createIssueMutation.mutateAsync({
                projectId,
                title: `[AI Mitigation] ${risk.title}`,
                description: `Auto-generated mitigation task.\n\n**Risk:** ${risk.description}\n\n**Recommendation:** ${risk.recommendation}`,
                priority: risk.severity === "high" ? "URGENT" : risk.severity === "medium" ? "HIGH" : "MEDIUM",
                status: "TODO",
                creatorId: userId,
            });
            setResolvedRiskIds(prev => new Set([...prev, risk.id]));
            addToast(
                <span>
                    ✅ Mitigation task created: <a href={`/en/pm/projects/${projectId}?issue=${newIssue.key}`} className="underline font-bold text-blue-500 hover:text-blue-400">{newIssue.key}</a>. Check your board!
                </span>
            );
        } catch (e) {
            addToast(`❌ Failed to create task. Check console.`);
        } finally {
            setActioningRiskId(null);
        }
    };
    const { data: riskReport, isLoading: isLoadingRisks, refetch: refetchRisks } = trpc.pmIntelligence.detectRisks.useQuery(
        { projectId },
        { staleTime: 5 * 60 * 1000 } // 5 min cache
    );

    const { data: insights, isLoading: isLoadingInsights, refetch: refetchInsights } = trpc.pmIntelligence.generateInsights.useQuery(
        { projectId },
        { staleTime: 5 * 60 * 1000 }
    );

    const { data: forecasts, isLoading: isLoadingForecast } = trpc.pmIntelligence.forecastDelivery.useQuery(
        { sprintId: sprintId! },
        { enabled: !!sprintId, staleTime: 5 * 60 * 1000 }
    );

    const isLoading = isLoadingRisks || isLoadingInsights;
    const highRisks = riskReport?.risks.filter(r => r.severity === "high") ?? [];
    const allRisks = riskReport?.risks ?? [];

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">Project Intelligence</h3>
                    {riskReport && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                            riskReport.overallHealthScore >= 80 ? "bg-green-500/10 text-green-600 border-green-500/20" :
                            riskReport.overallHealthScore >= 50 ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                            "bg-red-500/10 text-red-600 border-red-500/20"
                        }`}>
                            Health: {riskReport.overallHealthScore}/100
                        </span>
                    )}
                </div>
                <button
                    onClick={() => { refetchRisks(); refetchInsights(); }}
                    className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"
                    title="Refresh analysis"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm animate-pulse">Running intelligence analysis...</span>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Banner */}
                    {riskReport && (
                        <div className={`rounded-lg p-4 border text-sm ${
                            highRisks.length === 0 ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400" :
                            "bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400"
                        }`}>
                            {highRisks.length === 0 ? (
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {riskReport.summary}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {riskReport.summary}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Delivery Forecast */}
                    {forecasts && forecasts.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                <TrendingUp className="w-4 h-4" /> Delivery Forecast
                            </h4>
                            {forecasts.map((f, i) => (
                                <div key={i} className="border border-border rounded-lg p-4 bg-card space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-sm">{f.feature}</span>
                                        <span className="text-xs text-muted-foreground">
                                            Confidence: {Math.round(f.confidence * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{f.explanation.reasoning}</p>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">Predicted end:</span>
                                        <span className="font-mono font-medium">
                                            {new Date(f.predictedEnd).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {f.riskFactors.length > 0 && (
                                        <div className="pt-2 border-t border-border/50 space-y-1">
                                            {f.riskFactors.map((rf, j) => (
                                                <p key={j} className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> {rf}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Risks */}
                    {allRisks.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                <ShieldAlert className="w-4 h-4" /> Detected Risks ({allRisks.length})
                            </h4>
                            {allRisks.map(risk => (
                                <RiskCard
                                    key={risk.id}
                                    risk={risk}
                                    onAction={handleRiskAction}
                                    isActioning={actioningRiskId === risk.id}
                                    resolved={resolvedRiskIds.has(risk.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Insights */}
                    {insights && insights.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                <Lightbulb className="w-4 h-4" /> Insights ({insights.length})
                            </h4>
                            {insights.map((insight, i) => <InsightCard key={i} insight={insight} />)}
                        </div>
                    )}

                    {allRisks.length === 0 && (!insights || insights.length === 0) && (
                        <div className="text-center py-10 text-sm text-muted-foreground">
                            No risks or insights detected. The project looks healthy!
                        </div>
                    )}
                </div>
            )}

            {/* Floating toast notifications */}
            <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className="flex items-center gap-2 bg-card border border-border shadow-xl rounded-xl px-4 py-3 text-sm font-medium animate-in slide-in-from-right-4 duration-300"
                    >
                        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                        {t.message}
                    </div>
                ))}
            </div>
        </div>
    );
}

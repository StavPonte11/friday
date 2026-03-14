"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Sparkles, Loader2, Clock, Brain, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IssueInsightsPanelProps {
    issueId: string;
    initialComplexity?: number | null;
    initialTime?: string | null;
}

export function IssueInsightsPanel({ issueId, initialComplexity, initialTime }: IssueInsightsPanelProps) {
    const [complexity, setComplexity] = useState(initialComplexity);
    const [time, setTime] = useState(initialTime);
    const [skills, setSkills] = useState<string[]>([]);

    const { mutate: generate, isPending } = trpc.pmIssues.generateInsights.useMutation({
        onSuccess: (data) => {
            setComplexity(data.complexityScore);
            setTime(data.predictedTime);
            setSkills(data.suggestedAssigneeSkills);
        }
    });

    const hasInsights = complexity != null || time != null || skills.length > 0;

    return (
        <Card>
            <CardHeader className="pb-3 border-b border-border/50 mb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-500" /> AI Insights
                    </span>
                    {!hasInsights && (
                        <button
                            onClick={() => generate({ id: issueId })}
                            disabled={isPending}
                            className="bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 p-1.5 rounded-md transition-colors disabled:opacity-50"
                            title="Generate AI Insights"
                        >
                            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        </button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {hasInsights ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex flex-col gap-1 p-2 bg-muted/40 rounded-md border border-border/50">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Brain className="w-3 h-3" /> Complexity
                                </span>
                                <span className="font-semibold">{complexity ? `${complexity}/10` : '—'}</span>
                            </div>
                            <div className="flex flex-col gap-1 p-2 bg-muted/40 rounded-md border border-border/50">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Est. Time
                                </span>
                                <span className="font-semibold">{time || '—'}</span>
                            </div>
                        </div>

                        {skills.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-border/50">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Suggested Skills
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {skills.map((skill, i) => (
                                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground text-center py-4 flex flex-col items-center gap-2">
                        <Brain className="w-6 h-6 opacity-20" />
                        <p>No insights generated yet.</p>
                        <p className="max-w-[180px] opacity-80">Click the sparkle icon to estimate complexity and time.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Sparkles, Loader2, Bot, CheckSquare, Zap } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface SprintPlannerModalProps {
    projectId: string;
}

export function SprintPlannerModal({ projectId }: SprintPlannerModalProps) {
    const [open, setOpen] = useState(false);

    const { mutate: recommend, data: plan, isPending, reset } = trpc.pmSprints.recommendPlan.useMutation();

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            reset();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
                    <Sparkles size={16} /> Auto-Plan Sprint
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-purple-500" />
                        AI Sprint Recommendations
                    </DialogTitle>
                    <DialogDescription>
                        F.R.I.D.A.Y can analyze your backlog, consider issue dependencies and your team's velocity, and recommend an optimal next sprint.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 py-4">
                    {!plan && !isPending && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-2">
                                <Sparkles className="w-8 h-8 text-purple-500" />
                            </div>
                            <h3 className="font-semibold text-lg">Ready to plan?</h3>
                            <p className="text-sm text-muted-foreground max-w-[300px]">
                                We'll analyze your backlog issues and suggest a batch of work optimized for a 30-point velocity.
                            </p>
                            <button
                                onClick={() => recommend({ projectId, targetVelocity: 30 })}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 mt-4"
                            >
                                Generate Recommendation
                            </button>
                        </div>
                    )}

                    {isPending && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground animate-pulse">Analyzing backlog complexity and priority...</p>
                        </div>
                    )}

                    {plan && !isPending && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4">

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/40 border border-border/50 rounded-lg p-4">
                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <Zap className="w-3 h-3 text-amber-500" /> Target Velocity
                                    </div>
                                    <div className="text-2xl font-bold">30 pts</div>
                                </div>
                                <div className="bg-muted/40 border border-border/50 rounded-lg p-4">
                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <CheckSquare className="w-3 h-3 text-green-500" /> Plan Velocity
                                    </div>
                                    <div className={`text-2xl font-bold ${plan.estimatedVelocity > 33 ? 'text-red-500' : 'text-primary'}`}>
                                        {plan.estimatedVelocity} pts
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 prose prose-sm dark:prose-invert max-w-none">
                                <h4 className="text-purple-700 dark:text-purple-400 mt-0 flex items-center gap-2">
                                    <Bot className="w-4 h-4" /> Why this sprint?
                                </h4>
                                <p className="mb-0 text-foreground/90 leading-relaxed text-[13px]">{plan.reasoning}</p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium text-sm">Recommended Issues ({plan.issues.length})</h4>
                                <div className="space-y-2">
                                    {plan.issues.map(issue => (
                                        <div key={issue.id} className="flex items-center gap-3 p-3 border border-border rounded-md bg-card">
                                            <div className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/50 uppercase text-muted-foreground flex-shrink-0">
                                                {issue.key}
                                            </div>
                                            <div className="text-sm font-medium flex-1 truncate">{issue.title}</div>

                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {issue.priority !== 'NONE' && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${issue.priority === 'URGENT' ? 'bg-red-500/10 text-red-500' :
                                                            issue.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500' :
                                                                'bg-blue-500/10 text-blue-500'
                                                        }`}>
                                                        {issue.priority}
                                                    </span>
                                                )}
                                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold" title="Complexity / Story Points">
                                                    {(issue as any).complexityScore || 3}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {plan && !isPending && (
                    <div className="pt-4 border-t border-border flex justify-end gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => handleOpenChange(false)}
                            className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                // Real implementation would trigger a mutation to update all issue states or create a Sprint entity
                                alert("In reality, this would create a Sprint entity and assign these " + plan.issues.length + " issues to it.");
                                handleOpenChange(false);
                            }}
                            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            Accept Plan & Start Sprint
                        </button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

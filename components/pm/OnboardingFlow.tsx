"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function OnboardingFlow() {
    const [open, setOpen] = useState(true);
    const { data: status, isLoading } = trpc.pmOnboarding.getStatus.useQuery();
    const skipMutation = trpc.pmOnboarding.skip.useMutation();
    const completeStepMutation = trpc.pmOnboarding.completeStep.useMutation();

    if (isLoading || !open || status?.skipped || status?.completedSteps.includes("done")) return null;

    const steps = ["project", "issue", "invite", "done"];
    const currentStepIndex = Math.max(0, steps.findIndex(s => !status?.completedSteps.includes(s)));
    const currentStep = steps[currentStepIndex];

    const content = {
        project: { title: "Welcome to F.R.I.D.A.Y", desc: "Let's create your first project." },
        issue: { title: "Create an Issue", desc: "A project needs work. Create an issue to track task progress." },
        invite: { title: "Collaborate", desc: "Invite your team members to the workspace." },
        done: { title: "You're all set!", desc: "Enjoy the execution platform." }
    };

    const handleNext = async () => {
        await completeStepMutation.mutateAsync({ step: currentStep });
        if (currentStep === "invite") setOpen(false); 
    };

    const handleSkip = async () => {
        await skipMutation.mutateAsync();
        setOpen(false);
    };

    const stepData = content[currentStep as keyof typeof content];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-md p-6 rounded-xl shadow-xl flex flex-col gap-4">
                <div className="flex gap-1 mb-2">
                    {steps.slice(0, 3).map((s, i) => (
                        <div key={s} className={`h-1.5 flex-1 rounded-full ${i < currentStepIndex ? "bg-primary" : i === currentStepIndex ? "bg-primary/50" : "bg-muted"}`} />
                    ))}
                </div>
                <h2 className="text-xl font-bold">{stepData?.title}</h2>
                <p className="text-muted-foreground">{stepData?.desc}</p>
                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="ghost" onClick={handleSkip}>Skip</Button>
                    <Button onClick={handleNext}>{currentStep === "invite" ? "Finish" : "Next"}</Button>
                </div>
            </div>
        </div>
    );
}

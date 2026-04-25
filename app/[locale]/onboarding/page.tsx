"use client";

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { ThemeToggle } from "@/components/theme-toggle";

export default function OnboardingPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Abstract Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <div className="z-10 text-center max-w-3xl space-y-8">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                    F.R.I.D.A.Y.
                </h1>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                    Initializing your engineering workspace.
                </p>
            </div>

            <OnboardingWizard open={true} />
        </div>
    );
}

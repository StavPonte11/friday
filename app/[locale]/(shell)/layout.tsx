"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { trpc } from "@/lib/trpc/client";

export default function ShellLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const { data: workspaces, isLoading } = trpc.workspaces.list.useQuery();
    
    // Show wizard if workspaces load and are empty
    const showWizard = !isLoading && workspaces !== undefined && workspaces.length === 0;

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex flex-col flex-1 w-0 overflow-hidden">
                <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
                    {children}
                </main>
            </div>

            <CommandPalette />
            
            {showWizard && <OnboardingWizard open={true} />}
        </div>
    );
}

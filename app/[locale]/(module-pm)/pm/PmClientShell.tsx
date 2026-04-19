"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { GlobalFeedbackButton } from "@/components/shell/GlobalFeedbackButton";

export function PmClientShell({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex flex-col flex-1 w-0 overflow-hidden relative">
                {children}
            </div>
            <GlobalFeedbackButton />
        </div>
    );
}

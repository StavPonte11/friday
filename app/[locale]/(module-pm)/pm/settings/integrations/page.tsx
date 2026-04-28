"use client";

import React from "react";
import { IntegrationsPanel } from "@/components/pm/integrations/IntegrationsPanel";
import { useWorkspace } from "@/hooks/use-workspace";
import { Loader2 } from "lucide-react";

export default function IntegrationsSettingsPage() {
    const { workspace, isLoading } = useWorkspace();
    const workspaceId = workspace?.id;

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!workspaceId) {
        return (
            <div className="p-8 max-w-5xl mx-auto text-center text-muted-foreground">
                <p>No workspace found. Please create a workspace first.</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Integrations Hub</h1>
                <p className="text-muted-foreground mt-2">
                    Connect external tools to seamlessly synchronize data and work across platforms.
                </p>
            </div>
            
            <IntegrationsPanel workspaceId={workspaceId} />
        </div>
    );
}

"use client";

import React from "react";
import { IntegrationsPanel } from "@/components/pm/integrations/IntegrationsPanel";

// Mocking useWorkspace hook for MVP
const MOCK_WORKSPACE_ID = "workspace-1";

export default function IntegrationsSettingsPage() {
    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Integrations Hub</h1>
                <p className="text-muted-foreground mt-2">
                    Connect external tools to seamlessly synchronize data and work across platforms.
                </p>
            </div>
            
            <IntegrationsPanel workspaceId={MOCK_WORKSPACE_ID} />
        </div>
    );
}

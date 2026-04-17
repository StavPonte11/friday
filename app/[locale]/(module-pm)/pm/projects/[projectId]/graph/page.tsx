"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/client";
import { ExecutionGraph } from "@/components/pm/ExecutionGraph";
import { LoadingState } from "@/components/ui/loading-state";

export default function ExecutionGraphPage(props: { params: Promise<{ projectId: string }> }) {
    const params = use(props.params);
    const { projectId } = params;

    // workspaceId is not needed — pmGraph.getIssueGraph only requires projectId
    const { data: graphData, isLoading } = trpc.pmGraph.getIssueGraph.useQuery(
        { workspaceId: "", projectId },
        { enabled: !!projectId }
    );

    if (isLoading) {
        return <LoadingState title="Mapping Execution Graph..." description="Analysing issue dependencies." />;
    }

    if (!graphData || graphData.nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-4">
                <p className="text-2xl font-semibold text-foreground">Graph Empty</p>
                <p className="text-muted-foreground max-w-sm">
                    No issues with dependencies found in this project. Add relations between issues to visualise the execution graph.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col p-4 bg-background">
            <h1 className="text-2xl font-semibold text-foreground mb-6">Execution Graph</h1>
            <div className="flex-1 w-full relative min-h-0">
                <ExecutionGraph nodes={graphData.nodes} edges={graphData.edges} />
            </div>
        </div>
    );
}

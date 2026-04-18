"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Box, Calendar, Github, Figma, Trello, Plus, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IntegrationsPanel({ workspaceId }: { workspaceId: string }) {
    const { data: integrations, isLoading, refetch } = trpc.pmIntegrations.list.useQuery({ workspaceId });
    const connectMutation = trpc.pmIntegrations.connect.useMutation({
        onSuccess: () => refetch()
    });
    const disconnectMutation = trpc.pmIntegrations.disconnect.useMutation({
        onSuccess: () => refetch()
    });

    const [isConnecting, setIsConnecting] = useState<string | null>(null);

    const handleConnect = async (provider: string, type: "calendar" | "git" | "pm" | "design") => {
        setIsConnecting(provider);
        try {
            // MVP: Just mock the token exchange part
            const fakeToken = "ext_token_" + Math.random().toString(36).substr(2);
            await connectMutation.mutateAsync({
                workspaceId,
                type,
                provider,
                accessToken: fakeToken,
                metadata: { connectedAt: new Date().toISOString() }
            });
        } finally {
            setIsConnecting(null);
        }
    };

    const handleDisconnect = async (id: string) => {
        await disconnectMutation.mutateAsync({ id });
    };

    const hasIntegration = (provider: string) => {
        return integrations?.some((i) => i.provider === provider);
    };

    const getIntegrationId = (provider: string) => {
        return integrations?.find((i) => i.provider === provider)?.id;
    };

    const providers = [
        { id: "github", name: "GitHub", type: "git" as const, icon: <Github className="w-5 h-5" />, desc: "Link issues to PRs automatically" },
        { id: "gitlab", name: "GitLab", type: "git" as const, icon: <Github className="w-5 h-5 text-orange-500" />, desc: "Link issues to MRs automatically" },
        { id: "google", name: "Google Calendar", type: "calendar" as const, icon: <Calendar className="w-5 h-5 text-blue-500" />, desc: "Sync issue due dates" },
        { id: "jira", name: "Jira Import", type: "pm" as const, icon: <Trello className="w-5 h-5 text-indigo-500" />, desc: "Import projects & issues" },
        { id: "figma", name: "Figma", type: "design" as const, icon: <Figma className="w-5 h-5 text-pink-500" />, desc: "Embed and link design frames" },
    ];

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Workspace Integrations</h3>
                <p className="text-sm text-muted-foreground">Connect Friday to your favorite tools for seamless cross-platform execution.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((p) => {
                    const isConnected = hasIntegration(p.id);
                    const intId = getIntegrationId(p.id);
                    const loading = isConnecting === p.id || connectMutation.isPending || disconnectMutation.isPending;

                    return (
                        <div key={p.id} className="border rounded-lg p-5 flex flex-col justify-between bg-card hover:border-border/80 transition-colors">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="p-2 border rounded-md bg-secondary/30">
                                    {p.icon}
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        {p.name}
                                        {isConnected && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
                                </div>
                            </div>
                            
                            {isConnected ? (
                                <Button 
                                    variant="outline" 
                                    className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => intId && handleDisconnect(intId)}
                                    disabled={loading}
                                >
                                    Disconnect
                                </Button>
                            ) : (
                                <Button 
                                    variant="secondary" 
                                    className="w-full"
                                    onClick={() => handleConnect(p.id, p.type)}
                                    disabled={loading}
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Connect
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

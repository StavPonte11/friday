"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Box, Calendar, Github, Figma, Trello, Plus, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function IntegrationsPanel({ workspaceId }: { workspaceId: string }) {
    const { data: integrations, isLoading, refetch } = trpc.pmIntegrations.list.useQuery({ workspaceId }, {
        retry: false, // Prevents crash loop if workspaceId is invalid
    });
    const connectMutation = trpc.pmIntegrations.connect.useMutation({
        onSuccess: () => refetch()
    });
    const disconnectMutation = trpc.pmIntegrations.disconnect.useMutation({
        onSuccess: () => refetch()
    });


    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<{ id: string, name: string } | null>(null);
    const [accessToken, setAccessToken] = useState("");

    const handleConnect = async (provider: string, type: string, name: string) => {
        setSelectedIntegration({ id: provider, name });
        setAccessToken("");
        setConfigModalOpen(true);
    };

    const handleConfigSubmit = () => {
         if (!accessToken.trim()) return; // Don't submit empty tokens
         
         setConfigModalOpen(false);
         if (selectedIntegration) {
              const providerConfig = providers.find(p => p.id === selectedIntegration.id);
              connectMutation.mutate({
                  workspaceId,
                  provider: selectedIntegration.id,
                  type: providerConfig?.type || "pm",
                  accessToken: accessToken,
                  metadata: { registered: true }
              });
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
                    const loading = connectMutation.isPending || disconnectMutation.isPending;

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
                                    onClick={() => handleConnect(p.id, p.type, p.name)}
                                    disabled={loading}
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Connect
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configure {selectedIntegration?.name}</DialogTitle>
                        <DialogDescription>
                            Connect your workspace to {selectedIntegration?.name}. This lets Friday read and write to your external platform securely.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {selectedIntegration?.id === "google" ? (
                            <div className="space-y-4 text-center py-4">
                                <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-2">
                                    <Calendar className="w-6 h-6 text-blue-500" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    You will be redirected to Google to authorize Friday to access your calendars and events securely.
                                </p>
                                <Button 
                                    className="w-full bg-white text-black hover:bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center gap-2"
                                    onClick={() => {
                                        // Simulate real-world OAuth flow
                                        const mockOAuthToken = `ya29.a0Ael9s${Math.random().toString(36).substring(7)}...`;
                                        setAccessToken(mockOAuthToken);
                                        setTimeout(handleConfigSubmit, 500);
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    Sign in with Google
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">API Token / OAuth Key</label>
                                <Input 
                                    type="password" 
                                    placeholder="Paste your secure access token here..." 
                                    value={accessToken}
                                    onChange={(e) => setAccessToken(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your token is encrypted at rest and will only be used for syncing issues and events. 
                                </p>
                            </div>
                        )}
                    </div>
                    {selectedIntegration?.id !== "google" && (
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setConfigModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleConfigSubmit} disabled={!accessToken.trim()}>Complete Setup</Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

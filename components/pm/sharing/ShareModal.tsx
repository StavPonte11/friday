"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UsersRound, Share2, Loader2, ShieldX, Link as LinkIcon, Copy, Lock, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner"; // Assuming sonner is used for toasts, standard for shadcn

interface ShareModalProps {
    projectId: string;
    projectName: string;
}

export function ShareModal({ projectId, projectName }: ShareModalProps) {
    const { data: session } = useSession();
    const workspaceId = (session?.user as any)?.workspaceId;
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("people");
    
    // People 
    const { data: access, refetch: refetchAccess } = trpc.boardAccess.getAccess.useQuery(
        { projectId }, { enabled: open }
    );
    const { data: members } = trpc.adminUsers.list.useQuery(
        { workspaceId: workspaceId || "", limit: 100 }, { enabled: open && !!workspaceId }
    );
    const { data: groups } = trpc.adminGroups.list.useQuery(
        { workspaceId: workspaceId || "" }, { enabled: open && !!workspaceId }
    );

    // Links
    const { data: link, refetch: refetchLink, isLoading: linkLoading } = trpc.boardAccess.getLink.useQuery(
        { projectId }, { enabled: open && activeTab === "link" }
    );

    const grantMutation = trpc.boardAccess.grant.useMutation({ onSuccess: () => refetchAccess() });
    const revokeMutation = trpc.boardAccess.revoke.useMutation({ onSuccess: () => refetchAccess() });
    const createLink = trpc.boardAccess.createLink.useMutation({ onSuccess: () => refetchLink() });
    const revokeLink = trpc.boardAccess.revokeLink.useMutation({ onSuccess: () => refetchLink() });

    const [selectedEntity, setSelectedEntity] = useState<string>("");
    const [selectedRole, setSelectedRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
    
    const [linkPublic, setLinkPublic] = useState(false);
    const [linkPassword, setLinkPassword] = useState("");

    const handleGrant = () => {
        if (!selectedEntity) return;
        const isGroup = selectedEntity.startsWith("group:");
        const entityId = selectedEntity.replace("group:", "").replace("user:", "");
        grantMutation.mutate({
            projectId, entityType: isGroup ? "GROUP" : "USER", entityId, role: selectedRole
        });
        setSelectedEntity("");
    };

    const handleCreateLink = () => {
        createLink.mutate({ projectId, isPublic: linkPublic, password: linkPassword });
    };

    const copyLink = () => {
        if (!link) return;
        const url = `${window.location.origin}/en/pm/share/${link.token}`;
        navigator.clipboard.writeText(url);
        toast("Link copied to clipboard");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Share "{projectName}"</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="people">People & Groups</TabsTrigger>
                        <TabsTrigger value="link">Link Sharing</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="people" className="py-4 space-y-6">
                        <div className="flex gap-2 items-center">
                            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Add user or group..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {groups?.map(g => (
                                        <SelectItem key={`group:${g.id}`} value={`group:${g.id}`}>
                                            <div className="flex items-center"><UsersRound className="w-4 h-4 mr-2 text-muted-foreground"/> {g.name}</div>
                                        </SelectItem>
                                    ))}
                                    {members?.users.map(u => (
                                        <SelectItem key={`user:${u.id}`} value={`user:${u.id}`}>
                                            <div className="flex items-center">
                                                {u.image ? <img src={u.image} className="w-4 h-4 rounded-full mr-2" alt=""/> : <div className="w-4 h-4 rounded-full bg-primary/20 mr-2"/>}
                                                {u.name || u.email}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VIEWER">Viewer</SelectItem>
                                    <SelectItem value="EDITOR">Editor</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button onClick={handleGrant} disabled={!selectedEntity || grantMutation.isPending}>
                                {grantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : "Invite"}
                            </Button>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">People with access</h4>
                            <div className="space-y-3">
                                {access?.groups.map(grant => (
                                    <div key={grant.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UsersRound className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{grant.group.name}</div>
                                                <div className="text-xs text-muted-foreground">Group • {grant.role}</div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => revokeMutation.mutate({ accessId: grant.id })}>
                                            <ShieldX className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}

                                {access?.users.map(grant => (
                                    <div key={grant.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            {grant.user?.image ? (
                                                <img src={grant.user.image} className="w-8 h-8 rounded-full" alt="" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">
                                                    {grant.user?.name?.[0].toUpperCase() || grant.user?.email[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-medium">{grant.user?.name || "Unknown"}</div>
                                                <div className="text-xs text-muted-foreground">{grant.user?.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{grant.role}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => revokeMutation.mutate({ accessId: grant.id })}>
                                                <ShieldX className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {access?.users.length === 0 && access?.groups.length === 0 && (
                                    <div className="text-sm border border-dashed rounded-lg p-4 text-center text-muted-foreground">
                                        Only Workspace Admins currently have access.
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="link" className="py-4 space-y-6">
                        {linkLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                        ) : link ? (
                            <div className="space-y-4">
                                <div className="flex items-center p-4 bg-muted/50 rounded-lg border border-border">
                                    {link.isPublic ? <Globe className="w-5 h-5 mr-3 text-green-500" /> : <Lock className="w-5 h-5 mr-3 text-yellow-500" />}
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{link.isPublic ? "Public Link" : "Private Link"}</div>
                                        <div className="text-xs text-muted-foreground">Anyone with the link can view.</div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Input readOnly value={`${window.location.origin}/en/pm/share/${link.token}`} className="bg-muted text-muted-foreground" />
                                        <Button onClick={copyLink}><Copy className="w-4 h-4 mr-2" /> Copy</Button>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-border flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Viewed {link.viewCount} times</span>
                                    <Button variant="destructive" size="sm" onClick={() => revokeLink.mutate({ projectId })} disabled={revokeLink.isPending}>
                                        Revoke Link
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col gap-4 p-4 border border-border rounded-lg bg-card">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium">Public Access</div>
                                            <div className="text-xs text-muted-foreground text-balance mt-1">Allow anyone on the internet with the link to view this board.</div>
                                        </div>
                                        <Switch checked={linkPublic} onCheckedChange={setLinkPublic} />
                                    </div>
                                    
                                    {!linkPublic && (
                                        <div className="pt-4 border-t border-border">
                                            <label className="text-xs font-medium mb-1.5 block">Password Protect (Optional)</label>
                                            <Input type="password" placeholder="Leave empty for no password" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)} />
                                        </div>
                                    )}
                                </div>
                                <Button className="w-full" onClick={handleCreateLink} disabled={createLink.isPending}>
                                    {createLink.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Generate Link
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

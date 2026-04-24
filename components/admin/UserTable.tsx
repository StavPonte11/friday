"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { RoleBadge } from "./RoleBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/hooks/use-workspace";
import { Loader2, MoreVertical, ShieldAlert } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserTable() {
    const { workspace } = useWorkspace();
    const [page, setPage] = useState(1);
    
    const { data, isLoading, refetch } = trpc.adminUsers.list.useQuery(
        { workspaceId: workspace?.id || "", page, limit: 20 },
        { enabled: !!workspace?.id }
    );

    const updateRole = trpc.adminUsers.updateRole.useMutation({
        onSuccess: () => refetch()
    });

    const deactivate = trpc.adminUsers.deactivate.useMutation({
        onSuccess: () => refetch()
    });

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!data) return null;

    return (
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                        <tr>
                            <th className="px-6 py-4 font-medium">User</th>
                            <th className="px-6 py-4 font-medium">Role</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.users.map((user) => (
                            <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {user.image ? (
                                            <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium text-foreground">{user.name || "Unknown"}</div>
                                            <div className="text-muted-foreground text-xs">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {/* Role Selector */}
                                    <Select 
                                        defaultValue={user.role} 
                                        onValueChange={(val: any) => updateRole.mutate({ workspaceId: workspace!.id, userId: user.id, newRole: val })}
                                        disabled={updateRole.isPending}
                                    >
                                        <SelectTrigger className="w-32 h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OWNER">Owner</SelectItem>
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                            <SelectItem value="MEMBER">Member</SelectItem>
                                            <SelectItem value="VIEWER">Viewer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                                <td className="px-6 py-4">
                                    {user.isActive ? (
                                        <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-500">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-zinc-500/10 text-zinc-500">
                                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                                            Deactivated
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem 
                                                className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                                onClick={() => {
                                                    if(confirm("Are you sure you want to deactivate this user? They will lose all access immediately.")) {
                                                        deactivate.mutate({ workspaceId: workspace!.id, userId: user.id });
                                                    }
                                                }}
                                            >
                                                <ShieldAlert className="w-4 h-4 mr-2" />
                                                Deactivate Access
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {data.basePages > 1 && (
                <div className="p-4 border-t border-border flex justify-between items-center bg-muted/20">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        Page {page} of {data.basePages}
                    </span>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={page >= data.basePages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}

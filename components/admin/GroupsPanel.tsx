"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { UsersRound, Trash2, Edit2, Loader2, Plus, X } from "lucide-react";

export function GroupsPanel() {
    const { workspace } = useWorkspace();
    const { data: groups, isLoading, refetch } = trpc.adminGroups.list.useQuery(
        { workspaceId: workspace?.id || "" },
        { enabled: !!workspace?.id }
    );

    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");

    const createGroup = trpc.adminGroups.create.useMutation({
        onSuccess: () => {
            setIsCreating(false);
            setNewName("");
            setNewDesc("");
            refetch();
        }
    });

    const deleteGroup = trpc.adminGroups.delete.useMutation({
        onSuccess: () => refetch()
    });

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            {!isCreating && (
                <Button onClick={() => setIsCreating(true)} variant="outline" className="w-full border-dashed py-8 text-muted-foreground hover:text-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Group
                </Button>
            )}

            {isCreating && (
                <div className="p-4 rounded-xl border border-border bg-card/50 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-sm">Create Group</h4>
                        <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)} className="h-6 w-6"><X className="w-4 h-4"/></Button>
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Group Name (e.g. Frontend Team)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md mb-3"
                            autoFocus
                        />
                        <input
                            type="text"
                            placeholder="Description (Optional)"
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
                        <Button size="sm" onClick={() => createGroup.mutate({ workspaceId: workspace!.id, name: newName, description: newDesc })} disabled={!newName || createGroup.isPending}>
                            {createGroup.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : "Create"}
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {groups?.map((group) => (
                    <div key={group.id} className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all group relative">
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                onClick={() => {
                                    if(confirm(`Delete group "${group.name}"?`)) {
                                        deleteGroup.mutate({ workspaceId: workspace!.id, groupId: group.id });
                                    }
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <UsersRound className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground leading-none">{group.name}</h3>
                                <p className="text-xs text-muted-foreground mt-1">{group._count.members} Members</p>
                            </div>
                        </div>

                        {group.description && (
                            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                                {group.description}
                            </p>
                        )}

                        <div className="mt-5 pt-4 border-t border-border flex justify-between items-center">
                            <div className="text-xs text-muted-foreground">Created {new Date(group.createdAt).toLocaleDateString()}</div>
                            <Button variant="secondary" size="sm" className="text-xs h-8">Manage Members</Button>
                        </div>
                    </div>
                ))}

                {groups?.length === 0 && !isCreating && (
                    <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl border-border">
                        No groups defined yet.
                    </div>
                )}
            </div>
        </div>
    );
}

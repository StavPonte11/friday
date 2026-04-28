"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminSettingsPage() {
    const { workspace, workspaces, isLoading } = useWorkspace();
    const utils = trpc.useUtils();

    const [editName, setEditName] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const updateWorkspace = trpc.workspaces.update.useMutation({
        onSuccess: () => {
            utils.workspaces.list.invalidate();
            setIsEditing(false);
        }
    });

    const deleteWorkspace = trpc.workspaces.delete.useMutation({
        onSuccess: () => {
            // Clear cookie and redirect
            document.cookie = "friday_workspace_id=; path=/; max-age=0";
            window.location.href = "/en/pm/dashboard";
        }
    });

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
    }

    if (!workspace) {
        return (
            <div className="text-center text-muted-foreground py-20">
                <p>No workspace found.</p>
            </div>
        );
    }

    const handleEditOpen = () => {
        setEditName(workspace.name);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!editName.trim() || editName === workspace.name) return;
        updateWorkspace.mutate({ workspaceId: workspace.id, name: editName.trim() });
    };

    const canDelete = deleteConfirmText === workspace.name;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    General configurations and workspace management.
                </p>
            </div>

            {/* Workspace Info */}
            <div className="p-6 border border-border rounded-xl bg-card space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Current Workspace</p>
                        <h2 className="text-xl font-bold">{workspace.name}</h2>
                        <p className="text-xs text-muted-foreground font-mono mt-1">{workspace.slug}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleEditOpen}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                    <div>
                        <p className="text-xs text-muted-foreground">Workspace ID</p>
                        <p className="text-sm font-mono text-foreground/80 mt-0.5 truncate">{workspace.id}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Total Workspaces</p>
                        <p className="text-sm font-mono text-foreground/80 mt-0.5">{workspaces.length}</p>
                    </div>
                </div>
            </div>

            {/* Other workspaces */}
            {workspaces.length > 1 && (
                <div className="p-6 border border-border rounded-xl bg-card space-y-3">
                    <p className="text-sm font-semibold">Other Workspaces</p>
                    <div className="space-y-2">
                        {workspaces.filter(w => w.id !== workspace.id).map(w => (
                            <div key={w.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                                <div>
                                    <p className="text-sm font-medium">{w.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{w.slug}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        document.cookie = `friday_workspace_id=${w.id}; path=/; max-age=31536000`;
                                        window.location.reload();
                                    }}
                                >
                                    Switch
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Danger Zone */}
            <div className="p-6 border border-red-500/20 rounded-xl bg-red-500/5 space-y-4">
                <div>
                    <h4 className="text-red-500 font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Danger Zone
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">Permanent actions affecting the entire workspace.</p>
                </div>

                <div className="flex items-center justify-between py-4 border-t border-red-500/10">
                    <div>
                        <div className="font-medium text-sm">Delete Workspace</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Once deleted, all projects, issues, and data are gone forever.
                        </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Edit Workspace Name Modal */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="sm:max-w-[380px]">
                    <DialogHeader>
                        <DialogTitle>Rename Workspace</DialogTitle>
                        <DialogDescription>Update the display name for this workspace.</DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                        <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                            onKeyDown={e => e.key === "Enter" && handleSave()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!editName.trim() || editName === workspace.name || updateWorkspace.isPending}>
                            {updateWorkspace.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Delete Workspace</DialogTitle>
                        <DialogDescription>
                            This action is <strong className="text-foreground">irreversible</strong>. All projects, issues, sprints, and members will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3 space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Type <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{workspace.name}</code> to confirm deletion.
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value)}
                            placeholder={workspace.name}
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-destructive/50"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={!canDelete || deleteWorkspace.isPending}
                            onClick={() => deleteWorkspace.mutate({ workspaceId: workspace.id })}
                        >
                            {deleteWorkspace.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

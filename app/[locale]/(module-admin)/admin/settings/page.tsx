"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
    const { workspace } = useWorkspace();

    if (!workspace) return null;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    General configurations and advanced danger zone.
                </p>
            </div>

            <div className="p-6 border border-border rounded-xl bg-card space-y-6">
                <div>
                    <label className="text-sm font-medium">Workspace Name</label>
                    <input 
                        type="text" 
                        defaultValue={workspace.name} 
                        className="mt-2 w-full max-w-md px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium">Slug / ID</label>
                    <input 
                        type="text" 
                        defaultValue={workspace.slug} 
                        disabled
                        className="mt-2 w-full max-w-md px-3 py-2 bg-background border border-border rounded-md text-sm text-muted-foreground opacity-70"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Slug cannot be changed after creation.</p>
                </div>
                
                <Button>Save Changes</Button>
            </div>

            <div className="p-6 border border-red-500/20 rounded-xl bg-red-500/5 space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-red-500 font-semibold mb-1">Danger Zone</h4>
                        <p className="text-sm text-muted-foreground">Permanent actions affecting the entire workspace.</p>
                    </div>
                </div>

                <div className="flex items-center justify-between py-4 border-t border-red-500/10">
                    <div>
                        <div className="font-medium text-sm">Delete Workspace</div>
                        <div className="text-xs text-muted-foreground mt-1">Once deleted, all issues, comments, and data are gone forever.</div>
                    </div>
                    <Button variant="destructive" size="sm">Delete</Button>
                </div>
            </div>
        </div>
    );
}

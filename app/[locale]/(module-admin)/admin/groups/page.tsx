import { GroupsPanel } from "@/components/admin/GroupsPanel";

export default function AdminGroupsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Teams & Groups</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Organize users into logical groups for easier access sharing and mentions.
                </p>
            </div>

            <GroupsPanel />
        </div>
    );
}

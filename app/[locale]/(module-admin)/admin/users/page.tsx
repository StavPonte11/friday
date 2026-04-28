import { UserTable } from "@/components/admin/UserTable";
import { InviteUserModal } from "@/components/admin/InviteUserModal";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function AdminUsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Users</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage members, roles, and access within your organization.
                    </p>
                </div>
                <InviteUserModal>
                    <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite User
                    </Button>
                </InviteUserModal>
            </div>

            <UserTable />
        </div>
    );
}

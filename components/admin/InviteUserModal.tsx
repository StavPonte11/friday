"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export function InviteUserModal({ children }: { children: React.ReactNode }) {
    const { workspace } = useWorkspace();
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("MEMBER");
    const [successLink, setSuccessLink] = useState("");

    const invite = trpc.adminInvites.create.useMutation({
        onSuccess: (data) => {
            const link = `${window.location.origin}/en/invite/${data.token}`;
            setSuccessLink(link);
        }
    });

    const handleSubmit = () => {
        if (!email.trim() || !workspace?.id) return;
        invite.mutate({
            workspaceId: workspace.id,
            email: email.trim(),
            role: role as any
        });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(successLink);
        alert("Invite link copied to clipboard!");
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setEmail("");
                setSuccessLink("");
                invite.reset();
            }
        }}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite Teammate</DialogTitle>
                    <DialogDescription>
                        Send an invitation to join your workspace.
                    </DialogDescription>
                </DialogHeader>

                {!successLink ? (
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Address</label>
                            <Input 
                                type="email" 
                                placeholder="colleague@example.com" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Workspace Role</label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OWNER">Owner</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="MEMBER">Member</SelectItem>
                                    <SelectItem value="VIEWER">Viewer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {invite.error && (
                            <div className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded-md">
                                {invite.error.message}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Invite Created</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                The invite has been created successfully. Send this link to the user:
                            </p>
                            <div className="flex items-center gap-2">
                                <Input readOnly value={successLink} className="font-mono text-xs" />
                                <Button variant="secondary" onClick={handleCopy}>Copy</Button>
                            </div>
                        </div>
                    </div>
                )}

                {!successLink && (
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={!email.trim() || invite.isPending}>
                            {invite.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                            Send Invite
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

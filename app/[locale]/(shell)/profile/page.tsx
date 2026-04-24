"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Key } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
    const { data: session } = useSession();
    const [copied, setCopied] = useState(false);

    if (!session?.user) return null;

    const copyToken = () => {
        // Technically returning session id directly is for debug, we shouldn't show exact token, but showing user ID mapping
        navigator.clipboard.writeText(session.user.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
                <p className="text-muted-foreground mt-2">Manage your personal settings, avatar, and region preferences.</p>
            </div>

            <div className="p-6 border border-border rounded-xl space-y-6 bg-card text-card-foreground">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden">
                        {session.user.image ? (
                            <img src={session.user.image} alt={session.user.name || "Avatar"} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-semibold">{session.user.name?.[0] || session.user.email[0]}</span>
                        )}
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{session.user.name || "FRIDAY User"}</h3>
                        <p className="text-muted-foreground text-sm">{session.user.email}</p>
                    </div>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Timezone</label>
                    <Input disabled defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone} />
                    <p className="text-xs text-muted-foreground">Your timezone is automatically detected.</p>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium pt-4">User ID (Internal)</label>
                    <div className="flex bg-muted/50 border border-border rounded-lg items-center px-3 py-2 text-sm text-foreground/80 font-mono">
                        <Key className="w-4 h-4 mr-2" />
                        <span className="flex-1 truncate">{session.user.id}</span>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded shrink-0" onClick={copyToken}>
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
                
                <div className="pt-4 flex justify-end">
                    <Button disabled>Save Changes</Button>
                </div>
            </div>
        </div>
    );
}

function Check({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

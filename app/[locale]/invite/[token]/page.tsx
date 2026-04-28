"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function InviteFlow() {
    const { token } = useParams() as { token: string };
    const { data: session, status } = useSession();
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);

    const { data: invite, isLoading: validating, error: queryError } = trpc.adminInvites.validate.useQuery(
        { token },
        { 
            retry: false, 
            enabled: !!token && status === "authenticated", // We only validate if authed since it's a protectedProcedure currently...
            // Wait, validate is a protectedProcedure in the backend!
        }
    );

    const acceptMutation = trpc.adminInvites.accept.useMutation({
        onSuccess: (data) => {
            // Redirect to workspace
            router.push(`/en/pm/projects?workspaceId=${data.workspaceId}`);
        },
        onError: (e) => {
            setError(e.message);
        }
    });

    // If we need to accept automatically when logged in
    useEffect(() => {
        if (status === "authenticated" && invite && !acceptMutation.isPending && !error) {
            acceptMutation.mutate({ token });
        }
    }, [status, invite]);

    // Save token to localStorage if unauthenticated
    useEffect(() => {
        if (status === "unauthenticated" && token) {
            localStorage.setItem("pending_invite_token", token);
        }
    }, [status, token]);

    if (status === "loading" || validating || acceptMutation.isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Processing your invitation...</p>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full border rounded-xl p-8 bg-card shadow-2xl text-center space-y-6">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                        <ArrowRight className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">You've been invited!</h1>
                    <p className="text-muted-foreground leading-relaxed">
                        Log in or create an account to accept this invitation and join the workspace.
                    </p>
                    <div className="pt-4 flex flex-col gap-3">
                        <Button onClick={() => signIn("google")} className="w-full h-11 text-base">
                            Sign in with Google
                        </Button>
                        <Button onClick={() => signIn()} variant="outline" className="w-full h-11 text-base">
                            More login options
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (queryError || error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full border border-destructive/20 rounded-xl p-8 bg-destructive/5 text-center space-y-6">
                    <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-4">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-destructive">Invitation Failed</h1>
                    <p className="text-muted-foreground">{error || queryError?.message}</p>
                    <div className="pt-4">
                        <Link href="/">
                            <Button variant="outline" className="w-full">Return to Home</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full border rounded-xl p-8 bg-card text-center space-y-6">
                <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-4">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Joining Workspace...</h1>
            </div>
        </div>
    );
}

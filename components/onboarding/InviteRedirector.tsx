"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function InviteRedirector() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            const token = localStorage.getItem("pending_invite_token");
            if (token) {
                // We found a pending invite! Clear it from storage so we don't loop
                localStorage.removeItem("pending_invite_token");
                // Redirect back to the invite page so it can accept the invite automatically
                router.push(`/en/invite/${token}`);
            }
        }
    }, [status, router]);

    return null;
}

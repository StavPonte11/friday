"use client";

import { CommandCenter } from "@/components/pm/dashboard/CommandCenter";

export default function DashboardPage() {
    return (
        <div className="h-full p-6 bg-background">
            <CommandCenter />
        </div>
    );
}

"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/components/navigation/navigation";
import { Users, UsersRound, Settings } from "lucide-react";
import { cn } from "@/lib/ui/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Admin");
    const pathname = usePathname();

    const navItems = [
        { href: "/admin/users", label: "Team Members", icon: Users },
        { href: "/admin/groups", label: "Groups", icon: UsersRound },
        { href: "/admin/settings", label: "Workspace Settings", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card/50 px-4 py-8">
                <div className="mb-8 px-4">
                    <h2 className="text-xl font-bold tracking-tight">Admin Console</h2>
                    <p className="text-sm text-muted-foreground">Manage organization</p>
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                                    isActive 
                                        ? "bg-primary/10 text-primary" 
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="mx-auto max-w-5xl p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

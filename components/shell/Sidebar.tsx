"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ModuleSwitcher } from "@/components/shell/ModuleSwitcher";
import { NotificationCenter } from "@/components/shell/NotificationCenter";
import { UserMenu } from "@/components/shell/UserMenu";
import { WorkspaceSwitcher } from "@/components/shell/WorkspaceSwitcher";
import { PanelLeftClose, PanelLeftOpen, Search, ListOrdered, LayoutDashboard, BarChart2, FileText, Brain, CalendarRange, Plug, Target, FolderKanban, Crown, Layers2, Sparkles, Clock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const t = useTranslations("Shell");
    const pathname = usePathname();

    const pmNavItems = [
        { href: "/en/pm/dashboard", label: "Command Center", icon: Target },
        { href: "/en/pm/projects", label: "Projects", icon: FolderKanban },
        { href: "/en/pm/issues", label: "Issues", icon: ListOrdered },
        { href: "/en/pm/board", label: "Board", icon: LayoutDashboard },
        { href: "/en/pm/timeline", label: "Timeline", icon: CalendarRange },
        { href: "/en/pm/analytics", label: "Analytics", icon: BarChart2 },
        { href: "/en/pm/intelligence", label: "Intelligence", icon: Brain },
        { href: "/en/pm/executive", label: "Executive", icon: Crown },
        { href: "/en/pm/reports", label: "Reports", icon: FileText },
        { href: "/en/pm/settings/integrations", label: "Integrations", icon: Plug },
    ];

    const isPmModule = pathname?.includes("/pm/");

    function openCommandPalette() {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    }

    return (
        <div
            className={`flex flex-col border-r border-border bg-card transition-all duration-300 ${isOpen ? "w-64" : "w-16"
                }`}
        >
            <div className="flex items-center justify-between h-14 px-4 border-b border-border">
                {isOpen && <span className="font-bold text-lg tracking-tight">Friday</span>}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1 round-md hover:bg-accent text-muted-foreground"
                >
                    {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
            </div>

            <div className="p-2 border-b border-border space-y-2">
                <WorkspaceSwitcher isOpen={isOpen} />
                <ModuleSwitcher isOpen={isOpen} />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {isPmModule && (
                    <nav className="space-y-1">
                        {isOpen && <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 pt-2 pb-1 tracking-wider">Project</p>}
                        {pmNavItems.map(({ href, label, icon: Icon }) => {
                            const segment = href.split("/").pop() ?? "";
                            const isActive = pathname?.endsWith(segment) || pathname?.includes(`/${segment}/`);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors ${isActive
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                        }`}
                                >
                                    <Icon size={18} className="flex-shrink-0" />
                                    {isOpen && <span>{label}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>

            <div className="p-2 border-t border-border flex flex-col gap-2">
                <button
                    onClick={openCommandPalette}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent text-sm text-foreground w-full text-left"
                >
                    <Search size={18} className="text-muted-foreground flex-shrink-0" />
                    {isOpen && (
                        <span className="flex-1 flex items-center justify-between">
                            <span>Search</span>
                            <kbd className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground font-mono">⌘K</kbd>
                        </span>
                    )}
                </button>
                <div className="flex items-center gap-2 p-2">
                    <NotificationCenter />
                    {isOpen && <span className="text-sm">Notifications</span>}
                </div>
                <UserMenu isOpen={isOpen} />
            </div>
        </div>
    );
}

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ModuleSwitcher } from "@/components/shell/ModuleSwitcher";
import { NotificationCenter } from "@/components/shell/NotificationCenter";
import { UserMenu } from "@/components/shell/UserMenu";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const t = useTranslations("Shell");

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

            <div className="p-2 border-b border-border">
                <ModuleSwitcher isOpen={isOpen} />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {/* Module specific nav items would go here */}
                {isOpen && <p className="text-xs text-muted-foreground px-2 py-4">Modules Navigation Space</p>}
            </div>

            <div className="p-2 border-t border-border flex flex-col gap-2">
                <button className="flex items-center gap-2 p-2 rounded-md hover:bg-accent text-sm text-foreground">
                    <Search size={18} className="text-muted-foreground" />
                    {isOpen && <span>Search (Cmd+K)</span>}
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

"use client";

import React from "react";
import { LayoutGrid } from "lucide-react";

export function ModuleSwitcher({ isOpen }: { isOpen: boolean }) {
    // In a real app this uses the ModuleRegistry and User preferences
    return (
        <button className="w-full flex items-center justify-center lg:justify-start gap-2 p-2 rounded-md hover:bg-accent text-foreground">
            <LayoutGrid size={18} className="text-primary" />
            {isOpen && <span className="text-sm font-medium">Friday PM</span>}
        </button>
    );
}

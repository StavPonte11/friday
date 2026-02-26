"use client";

import React, { useEffect, useState } from "react";

export function CommandPalette() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[20vh]">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-border">
                    <input
                        type="text"
                        placeholder="Search Friday..."
                        className="w-full bg-transparent border-none outline-none text-lg"
                        autoFocus
                    />
                </div>
                <div className="p-4 text-sm text-muted-foreground">
                    <p>Search through issues, traces, and settings...</p>
                </div>
            </div>
            <div className="absolute inset-0 -z-10" onClick={() => setOpen(false)} />
        </div>
    );
}

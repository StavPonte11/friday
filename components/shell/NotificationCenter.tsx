"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";

export function NotificationCenter() {
    const [unreadCount, setUnreadCount] = useState(3);

    return (
        <button className="relative p-2 rounded-md hover:bg-accent text-foreground transition-colors">
            <Bell size={18} className="text-muted-foreground" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
            )}
        </button>
    );
}

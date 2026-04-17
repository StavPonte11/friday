"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export function MentionInput({ value, onChange, onSubmit }: { value: string, onChange: (v: string) => void, onSubmit: () => void }) {
    const [mentionQuery, setMentionQuery] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    
    // Simplistic search since we don't have full cursor position tracking 
    const { data: users } = trpc.pmMentions.searchUsers.useQuery({ query: mentionQuery }, { enabled: mentionQuery.length > 0 });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        onChange(val);
        
        const lastWord = val.split(" ").pop();
        if (lastWord && lastWord.startsWith("@")) {
            setMentionQuery(lastWord.slice(1));
            setShowOptions(true);
        } else {
            setShowOptions(false);
        }
    };
    
    const insertMention = (username: string) => {
        const parts = value.split(" ");
        parts.pop(); // Remove the partial @mention
        const newValue = [...parts, `@${username} `].join(" ");
        onChange(newValue);
        setShowOptions(false);
    };

    return (
        <div className="relative w-full">
            <textarea
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="w-full p-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
                placeholder="Write a comment... (Type @ to mention)"
            />
            
            {showOptions && users && users.length > 0 && (
                <div className="absolute z-10 bottom-full left-0 w-64 mb-1 bg-background border rounded-md shadow-lg py-1">
                    {users.map((u: any) => (
                        <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => insertMention(u.name || "Unknown")}
                        >
                            {u.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

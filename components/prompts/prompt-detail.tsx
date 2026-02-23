"use client";

import { useState } from "react";
import { diffLines } from "diff";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PromptDetailProps {
    promptName: string;
}

export function PromptDetail({ promptName }: PromptDetailProps) {
    // Placeholder data for demonstration
    const [oldText] = useState("You are an AI assistant.\nAlways be polite.");
    const [newText] = useState("You are a senior AI assistant.\nAlways be polite and concise.");

    const diff = diffLines(oldText, newText);

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="text-xl">Prompt: {promptName}</CardTitle>
                    <CardDescription>Version History & Diff Viewer</CardDescription>
                </div>
                <Button variant="default">Promote to Production</Button>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold mb-2 text-sm">Version Diff (v2 vs v3)</h3>
                    <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
                        {diff.map((part, index) => {
                            const color = part.added ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                                part.removed ? "bg-red-500/20 text-red-700 dark:text-red-400" :
                                    "text-muted-foreground";
                            const prefix = part.added ? "+ " : part.removed ? "- " : "  ";

                            return (
                                <div key={index} className={color}>
                                    {part.value.split('\n').filter((line, i, arr) => line || i < arr.length - 1).map((line, i) => (
                                        <div key={i}>{prefix}{line}</div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold mb-2 text-sm">Variables Schema</h3>
                    <div className="flex gap-2">
                        <Badge variant="outline">user_name (string)</Badge>
                        <Badge variant="outline">context (string)</Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

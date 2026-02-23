"use client";

import { useConflicts } from "@/hooks/use-prompts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ConflictResolutionPanel() {
    const { data: conflicts, isLoading } = useConflicts();

    if (isLoading) return null;
    if (!conflicts || conflicts.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-red-500 flex items-center gap-2">
                Action Required: Conflicts Detected
            </h2>
            {conflicts.map((conflict) => (
                <Card key={conflict.id} className="border-red-500/50 bg-red-500/5">
                    <CardHeader>
                        <CardTitle className="text-lg">Conflict in: {conflict.promptName}</CardTitle>
                        <CardDescription>
                            Production version ({conflict.prodVersion}) was updated after your feature branch ({conflict.featVersion}) was created.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        <Button variant="default" className="bg-red-600 hover:bg-red-700">Accept Feature</Button>
                        <Button variant="outline">Accept Production</Button>
                        <Button variant="secondary">Resolve Manually</Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

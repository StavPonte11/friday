"use client";

import { usePrompts } from "@/hooks/use-observability";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function PromptCatalog() {
    const { data, isLoading, error } = usePrompts(1);

    if (error) {
        return <div className="text-red-500 p-4 border rounded-md">Error loading prompts.</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Prompt Catalog</CardTitle>
                <CardDescription>Manage and view versions of all prompts in Langfuse.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Prompt Name</TableHead>
                                <TableHead>Active Version</TableHead>
                                <TableHead>Labels</TableHead>
                                <TableHead>Type</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    </TableRow>
                                ))
                            ) : data?.data && Array.isArray(data.data) && data.data.length > 0 ? (
                                data.data.map((prompt: any) => (
                                    <TableRow key={prompt.name} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-medium">{prompt.name}</TableCell>
                                        <TableCell>v{prompt.lastConfigVersion?.version || 1}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {prompt.labels?.map((label: string) => (
                                                    <Badge key={label} variant={label === "production" ? "default" : "secondary"} className="text-xs">
                                                        {label}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{prompt.type || "text"}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No prompts found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

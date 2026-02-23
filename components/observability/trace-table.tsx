"use client";

import { useTraces } from "@/hooks/use-observability";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { TraceDrawer } from "./trace-drawer";
import { LangFuseTrace } from "@/types";

export function TraceTable() {
    const { data, isLoading, error } = useTraces();
    const [selectedTrace, setSelectedTrace] = useState<LangFuseTrace | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    if (error) {
        return <div className="text-red-500 p-4 border rounded-md">Error loading traces.</div>;
    }

    const handleRowClick = (trace: LangFuseTrace) => {
        setSelectedTrace(trace);
        setIsDrawerOpen(true);
    };

    return (
        <>
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Trace ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Latency</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                </TableRow>
                            ))
                        ) : data?.data && Array.isArray(data.data) && data.data.length > 0 ? (
                            data.data.map((trace: LangFuseTrace) => (
                                <TableRow
                                    key={trace.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleRowClick(trace)}
                                >
                                    <TableCell className="font-mono text-xs">{trace.id.substring(0, 8)}</TableCell>
                                    <TableCell className="font-medium">{trace.name || "Unnamed"}</TableCell>
                                    <TableCell>{trace.latency?.toFixed(2) || "N/A"}s</TableCell>
                                    <TableCell>${trace.totalCost?.toFixed(6) || "0.000000"}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {trace.tags?.map((tag: string) => (
                                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={trace.level === "ERROR" ? "destructive" : "outline"}>
                                            {trace.level || "SUCCESS"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No traces found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <TraceDrawer
                trace={selectedTrace}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </>
    );
}

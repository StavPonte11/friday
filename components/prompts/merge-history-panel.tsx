"use client";

import { useMergeHistory } from "@/hooks/use-prompts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MergeHistoryPanel() {
    const { data: history, isLoading } = useMergeHistory();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Merge History & Audit Log</CardTitle>
                <CardDescription>Log of automated prompt merges triggered by GitLab</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Trigger</TableHead>
                                <TableHead>Feature Branch</TableHead>
                                <TableHead>Target Prompt</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                            ) : history?.length ? (
                                history.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm">{new Date(log.timestamp).toLocaleString()}</TableCell>
                                        <TableCell className="font-medium text-blue-500 text-sm hover:underline cursor-pointer">
                                            {log.trigger}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{log.branch}</TableCell>
                                        <TableCell className="font-mono text-xs font-semibold">{log.prompt}</TableCell>
                                        <TableCell>
                                            <Badge variant={log.status === "success" ? "default" : log.status === "conflict" ? "destructive" : "secondary"}>
                                                {log.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No merge history.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

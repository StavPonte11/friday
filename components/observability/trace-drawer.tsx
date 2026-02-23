"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TraceDrawerProps {
    trace: any;
    isOpen: boolean;
    onClose: () => void;
}

export function TraceDrawer({ trace, isOpen, onClose }: TraceDrawerProps) {
    if (!trace) return null;

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                    <DrawerTitle className="flex items-center gap-2">
                        Trace: {trace.name || "Unnamed"}
                        <Badge variant={trace.level === "ERROR" ? "destructive" : "outline"}>
                            {trace.level || "SUCCESS"}
                        </Badge>
                    </DrawerTitle>
                    <DrawerDescription className="font-mono text-xs">ID: {trace.id}</DrawerDescription>
                </DrawerHeader>

                <div className="p-4 overflow-y-auto w-full max-w-5xl mx-auto space-y-6">
                    {/* Metadata Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                        <div>
                            <p className="text-sm text-muted-foreground">Latency</p>
                            <p className="font-semibold">{trace.latency?.toFixed(2) || "N/A"}s</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Cost</p>
                            <p className="font-semibold">${trace.totalCost?.toFixed(6) || "0.000000"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">User ID</p>
                            <p className="font-semibold">{trace.userId || "Anonymous"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Timestamp</p>
                            <p className="font-semibold">{new Date(trace.timestamp).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Prompt/Input Area */}
                    <div>
                        <h3 className="text-sm font-medium mb-2">Input</h3>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                            {JSON.stringify(trace.input, null, 2) || "No input recorded"}
                        </pre>
                    </div>

                    {/* Output Area */}
                    <div>
                        <h3 className="text-sm font-medium mb-2">Output</h3>
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm border-l-4 border-primary">
                            {JSON.stringify(trace.output, null, 2) || "No output recorded"}
                        </pre>
                    </div>

                    {/* Gantt Span Tree Placeholder */}
                    <div>
                        <h3 className="text-sm font-medium mb-2">Span Hierarchy</h3>
                        <div className="bg-muted/50 p-6 rounded-md flex items-center justify-center border border-dashed">
                            <span className="text-muted-foreground text-sm">Gantt Span Tree (Coming Soon)</span>
                        </div>
                    </div>
                </div>

                <DrawerFooter className="pt-2">
                    <DrawerClose asChild>
                        <Button variant="outline">Close Drawer</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

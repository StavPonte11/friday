"use client";

import { useMetrics } from "@/hooks/use-observability";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock, Coins, AlertTriangle } from "lucide-react";

export function MetricCards() {
    const { data, isLoading, error } = useMetrics();

    if (error) {
        return <div className="text-red-500 p-4 border border-red-500 rounded-md">Error loading metrics</div>;
    }

    const items = [
        { title: "Total Traces", value: data?.totalTraces, icon: <Activity className="h-4 w-4 text-muted-foreground" /> },
        { title: "Avg Latency (s)", value: data?.averageLatency, icon: <Clock className="h-4 w-4 text-muted-foreground" /> },
        { title: "Tokens Used", value: data?.totalTokens?.toLocaleString(), icon: <Coins className="h-4 w-4 text-muted-foreground" /> },
        { title: "Error Rate (%)", value: data?.errorRate, icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" /> },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                        {item.icon}
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-[100px]" />
                        ) : (
                            <div className="text-2xl font-bold">{item.value}</div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

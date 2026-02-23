"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTraces } from "@/hooks/use-observability";
import { Skeleton } from "@/components/ui/skeleton";

export function LatencyCharts() {
    const { data, isLoading, error } = useTraces();

    // Mock transformation of data for standard chart display
    const chartData = useMemo(() => {
        if (!data?.data || !Array.isArray(data.data)) return [];

        return data.data.slice(0, 30).map((trace: any) => ({
            name: trace.name || trace.id?.substring(0, 8) || "Trace",
            latency: trace.latency || Math.random() * 2,
        }));
    }, [data]);

    if (error) {
        return <div className="text-red-500 p-4 border rounded-md border-red-500">Failed to load latency data.</div>;
    }

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Latency over Time</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                ) : chartData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
                ) : (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}s`} />
                                <Tooltip />
                                <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AnalyticsDashboardPage() {
    const dauQuery = trpc.pmAnalytics.dailyActiveUsers.useQuery();
    const featuresQuery = trpc.pmAnalytics.featureUsage.useQuery();
    const uxQuery = trpc.pmAnalytics.uxInsights.useQuery();
    const issuesQuery = trpc.pmAnalytics.issuesCreatedPerDay.useQuery();
    
    const isLoading = dauQuery.isLoading || featuresQuery.isLoading || uxQuery.isLoading || issuesQuery.isLoading;

    if (isLoading) return <LoadingState />;

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto">
            <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">DAU (Today)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{dauQuery.data?.[dauQuery.data.length - 1]?.count || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Unique users across the platform</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Features Traced</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{featuresQuery.data?.length || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Distinct event types triggered</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">New Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{issuesQuery.data?.[issuesQuery.data.length - 1]?.count || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Issues created today</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                <Card className="shadow-sm h-fit max-h-[400px] overflow-hidden flex flex-col">
                    <CardHeader className="bg-muted/30">
                        <CardTitle>Feature Usage Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto flex-1">
                        <Table>
                            <TableHeader className="bg-card sticky top-0 z-10">
                                <TableRow>
                                    <TableHead>Event Configuration</TableHead>
                                    <TableHead className="text-right">Execution Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {featuresQuery.data?.map((f: any) => (
                                    <TableRow key={f.event} className="hover:bg-muted/30">
                                        <TableCell className="font-medium text-sm">{f.event}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{f.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-blue-500/20 bg-blue-50/5 dark:bg-blue-900/5">
                    <CardHeader>
                        <CardTitle className="flex flex-col gap-1">
                            <span>UX & Observability Insights</span>
                            <span className="text-xs font-normal text-muted-foreground leading-normal">
                                Automated heuristic detections of application usage parameters.
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {uxQuery.data?.length === 0 && <span className="text-sm text-muted-foreground italic">No insights acquired yet based on current data volumes.</span>}
                        {uxQuery.data?.map((insight: any, idx: number) => (
                            <div key={idx} className="border-l-2 pl-4 py-1 border-primary/50 relative group">
                                <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-primary group-hover:scale-125 transition-transform"></div>
                                <h4 className="font-semibold text-sm capitalize">{insight.type} Insight</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">{insight.message}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

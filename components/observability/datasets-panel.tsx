import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SessionsView() {
    return (
        <Card className="col-span-full md:col-span-2">
            <CardHeader>
                <CardTitle>Sessions</CardTitle>
                <CardDescription>Grouped user journeys and cost tracking</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    Session data coming soon
                </div>
            </CardContent>
        </Card>
    );
}

export function DatasetsPanel() {
    return (
        <Card className="col-span-full md:col-span-2">
            <CardHeader>
                <CardTitle>Datasets & Experiments</CardTitle>
                <CardDescription>Manage datasets and compare experimental runs</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    Datasets data coming soon
                </div>
            </CardContent>
        </Card>
    );
}

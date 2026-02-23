import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ScoresPanel() {
    return (
        <Card className="col-span-full md:col-span-2">
            <CardHeader>
                <CardTitle>Scores & Evaluation</CardTitle>
                <CardDescription>Human feedback and LLM-as-judge results</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    Scores data coming soon
                </div>
            </CardContent>
        </Card>
    );
}

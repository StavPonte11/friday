import { MetricCards } from "@/components/observability/metric-cards";
import { LatencyCharts } from "@/components/observability/latency-charts";
import { TraceTable } from "@/components/observability/trace-table";
import { ScoresPanel } from "@/components/observability/scores-panel";
import { SessionsView, DatasetsPanel } from "@/components/observability/datasets-panel";

export default function ObservabilityPage() {
    return (
        <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Observability Dashboard</h1>
                <p className="text-muted-foreground">Real-time metrics, tracing, and evaluation powered by Langfuse.</p>
            </div>

            {/* Metrics Row */}
            <section>
                <MetricCards />
            </section>

            {/* Charts Row */}
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <LatencyCharts />
            </section>

            {/* Traces Table Row */}
            <section>
                <h2 className="text-2xl font-bold tracking-tight mb-4">Trace Explorer</h2>
                <TraceTable />
            </section>

            {/* Additional Panels Area */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <ScoresPanel />
                <SessionsView />
                <DatasetsPanel />
            </section>
        </main>
    );
}

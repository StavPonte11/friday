import Link from "next/link";
import { Activity, Kanban, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function HomePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="z-10 text-center max-w-3xl space-y-8">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
          F.R.I.D.A.Y.
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto">
          Central intelligence and engineering portal. Select a module to begin.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 w-full max-w-4xl mx-auto text-left">
          {/* PM Module Card */}
          <Link href={`/${locale}/pm`} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-2xl hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="text-primary h-6 w-6" />
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
              <Kanban size={28} />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-foreground">Friday PM</h3>
            <p className="text-muted-foreground leading-relaxed">
              AI-driven project management, sprint health analysis, and automated backlog prioritization.
            </p>
          </Link>

          {/* Observability Card */}
          <Link href={`/${locale}/observability`} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-2xl hover:border-purple-500/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="text-purple-500 h-6 w-6" />
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-500 group-hover:scale-110 transition-transform">
              <Activity size={28} />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-foreground">Observability</h3>
            <p className="text-muted-foreground leading-relaxed">
              Real-time metrics, tracing, and evaluation powered by Langfuse integration.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

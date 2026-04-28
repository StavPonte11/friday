import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-lg w-full text-center space-y-8">
                {/* Large 404 */}
                <div className="relative">
                    <p className="text-[180px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground/20 to-foreground/5 select-none">
                        404
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                            <span className="text-3xl font-black text-primary">F</span>
                        </div>
                    </div>
                </div>

                {/* Message */}
                <div className="space-y-3">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Page not found
                    </h1>
                    <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                        This page doesn't exist or may have been moved. Let's get you back on track.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        href="/en/pm/dashboard"
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        Go to Dashboard
                    </Link>
                    <Link
                        href="/en/pm/projects"
                        className="px-6 py-2.5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                    >
                        View Projects
                    </Link>
                </div>

                {/* Subtle footer */}
                <p className="text-xs text-muted-foreground/50 mt-8">
                    F.R.I.D.A.Y — Execution OS
                </p>
            </div>
        </div>
    );
}

import Link from "next/link";
import { Activity, Beaker } from "lucide-react";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg mr-4">
                        <span className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs tracking-widest">
                            F.R.I.D.A.Y.
                        </span>
                    </Link>
                    <Link href="/observability" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <Activity className="h-4 w-4" />
                        Observability
                    </Link>
                    <Link href="/prompts" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <Beaker className="h-4 w-4" />
                        Prompts
                    </Link>
                </nav>
            </header>
            <div className="flex-1 bg-muted/20">
                {children}
            </div>
        </div>
    );
}

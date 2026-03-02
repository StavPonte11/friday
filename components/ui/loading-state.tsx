import { Activity } from "lucide-react";

interface LoadingStateProps {
    title?: string;
    description?: string;
    className?: string;
}

export function LoadingState({
    title = "Loading...",
    description,
    className = ""
}: LoadingStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 w-full h-full min-h-[50vh] space-y-6 animate-in fade-in duration-500 ${className}`}>
            <div className="w-16 h-16 relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <Activity className="absolute inset-0 m-auto text-primary w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold tracking-tight">{title}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
        </div>
    );
}

// Slimmer version for inline loads (like table rows or small cards)
export function LoadingSpinner({ className = "" }: { className?: string }) {
    return (
        <div className={`p-4 flex justify-center w-full ${className}`}>
            <div className="w-6 h-6 relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
        </div>
    );
}

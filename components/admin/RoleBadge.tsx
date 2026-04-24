import { cn } from "@/lib/ui/utils";

interface RoleBadgeProps {
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
    const styles = {
        OWNER: "bg-red-500/10 text-red-500 border-red-500/20",
        ADMIN: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        MEMBER: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        VIEWER: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };

    return (
        <span className={cn("px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider", styles[role], className)}>
            {role}
        </span>
    );
}

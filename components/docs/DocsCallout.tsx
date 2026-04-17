import React from "react";
import { Info, Lightbulb, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "tip" | "warning" | "important";

const CONFIG: Record<CalloutType, { icon: React.ElementType; bg: string; border: string; text: string }> = {
  info:      { icon: Info,         bg: "bg-blue-500/10",   border: "border-blue-500/30",  text: "text-blue-400" },
  tip:       { icon: Lightbulb,    bg: "bg-green-500/10",  border: "border-green-500/30", text: "text-green-400" },
  warning:   { icon: AlertTriangle,bg: "bg-amber-500/10",  border: "border-amber-500/30", text: "text-amber-400" },
  important: { icon: AlertCircle,  bg: "bg-red-500/10",    border: "border-red-500/30",   text: "text-red-400" },
};

export function DocsCallout({ type = "info", children }: { type?: CalloutType; children: React.ReactNode }) {
  const { icon: Icon, bg, border, text } = CONFIG[type];
  return (
    <div className={cn("flex gap-4 p-5 rounded-2xl border my-6 shadow-sm relative overflow-hidden group transition-all hover:shadow-md", bg, border)}>
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl", `bg-${text.split("-")[1]}-500`)} />
      <div className={cn("flex-shrink-0 mt-0.5", text)}>
        <Icon size={20} />
      </div>
      <div className="text-sm leading-relaxed text-foreground [&>p]:m-0 relative z-10">{children}</div>
    </div>
  );
}

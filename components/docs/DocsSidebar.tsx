"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { 
  BookOpen, Telescope, Cpu, Kanban, 
  Activity, Bot, Plug2, Rocket, ExternalLink, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    title: "Getting Started",
    items: [
      { slug: "overview", label: "Overview", icon: BookOpen },
      { slug: "vision", label: "Vision & Mission", icon: Telescope },
      { slug: "getting-started", label: "Quick Start", icon: Rocket },
    ]
  },
  {
    title: "Core Modules",
    items: [
      { slug: "pm", label: "FRIDAY PM", icon: Kanban },
      { slug: "traces", label: "FRIDAY Traces", icon: Activity },
      { slug: "agents", label: "Agents & MCP", icon: Bot },
    ]
  },
  {
    title: "Architecture & Integrations",
    items: [
      { slug: "architecture", label: "Platform Architecture", icon: Cpu },
      { slug: "integrations", label: "System Integrations", icon: Plug2 },
    ]
  }
];

export function DocsSidebar() {
  const pathname = usePathname() || "";
  const locale = useLocale();

  return (
    <aside className="w-[280px] shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-3xl flex flex-col overflow-y-auto relative z-20">
      
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-border/40">
        <Link href={`/${locale}/docs`} className="flex flex-col group relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 border border-zinc-800 transition-all hover:border-zinc-700 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-[0_0_15px_rgba(var(--primary),0.5)]">
              F
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-100 tracking-tight leading-tight">F.R.I.D.A.Y</span>
              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-widest leading-none">Documentation</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-8">
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
              {group.title}
            </h4>
            <div className="space-y-1">
              {group.items.map(({ slug, label, icon: Icon }) => {
                const href = `/${locale}/docs/${slug}`;
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={slug}
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 relative",
                      isActive
                        ? "text-primary font-medium bg-primary/10 shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
                    )}
                    <Icon size={16} className={cn("flex-shrink-0 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 mt-auto">
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 backdrop-blur-sm flex flex-col gap-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            System Online
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">Version 0.1.0-mvp</span>
            <Link href={`/${locale}/pm/projects`} className="text-[10px] text-primary hover:underline flex items-center gap-1">
              Access PM <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

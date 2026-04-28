"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { 
  BookOpen, Telescope, Cpu, Kanban, 
  Activity, Bot, Plug2, Rocket, ExternalLink, ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    title: "Getting Started",
    items: [
      { slug: "overview", label: "Overview", icon: BookOpen },
      { slug: "vision", label: "Vision & Mission", icon: Telescope },
      { slug: "getting-started", label: "Quick Start", icon: Rocket },
      { slug: "upcoming", label: "Roadmap", icon: Activity },
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
    title: "Platform",
    items: [
      { slug: "architecture", label: "Architecture", icon: Cpu },
      { slug: "integrations", label: "Integrations", icon: Plug2 },
    ]
  }
];

export function DocsSidebar() {
  const pathname = usePathname() || "";
  const locale = useLocale();

  return (
    <aside className="w-[260px] shrink-0 border-r border-border/40 bg-background flex flex-col overflow-y-auto">
      
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-border/40">
        <Link href={`/${locale}/pm/dashboard`} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm flex-shrink-0">
            F
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-foreground tracking-tight">F.R.I.D.A.Y</span>
            <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Docs</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group, i) => (
          <div key={i}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-2">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ slug, label, icon: Icon }) => {
                const href = `/${locale}/docs/${slug}`;
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={slug}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150",
                      isActive
                        ? "text-foreground bg-muted font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon size={14} className={cn("flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")} />
                    <span>{label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border/40">
        <Link
          href={`/${locale}/pm/projects`}
          className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <span className="font-medium">Open FRIDAY PM</span>
          <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-3">v0.1.0-mvp</p>
      </div>
    </aside>
  );
}

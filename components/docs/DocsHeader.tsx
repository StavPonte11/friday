"use client";

import { useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";

const DOC_PAGES = [
  { slug: "overview",       title: "Overview",              description: "What FRIDAY is and core features" },
  { slug: "vision",         title: "Vision & Mission",      description: "Agentic web mission and roadmap" },
  { slug: "architecture",   title: "Platform Architecture", description: "Modules, MCP, tRPC, LLM, pgvector" },
  { slug: "pm",             title: "FRIDAY PM",             description: "Issue tracking, Gantt, and sprints" },
  { slug: "traces",         title: "FRIDAY Traces",         description: "LLM observability and Langfuse" },
  { slug: "agents",         title: "Agents & MCP",          description: "Agent execution, tools, and custom code" },
  { slug: "integrations",   title: "Integrations",          description: "Email, Calendar, GitHub webhooks" },
  { slug: "getting-started", title: "Quick Start",          description: "Setup project and invite team" },
];

export function DocsHeader() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname() || "";

  const currentSlug = pathname.split("/").pop();
  const currentPage = DOC_PAGES.find(p => p.slug === currentSlug) || DOC_PAGES[0];

  const filtered = query.trim().length >= 2
    ? DOC_PAGES.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleNav = (slug: string) => {
    router.push(`/${locale}/docs/${slug}`);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <header className="h-14 border-b border-border/40 bg-background flex items-center px-6 gap-4 shrink-0 sticky top-0 z-40">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-1 min-w-0">
        <span className="hover:text-foreground transition-colors cursor-default">Docs</span>
        <ChevronRight size={12} className="text-muted-foreground/50 flex-shrink-0" />
        <span className="text-foreground font-medium truncate">{currentPage?.title}</span>
      </nav>

      {/* Search */}
      <div className="relative w-72 flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            placeholder="Search docs..."
            className="w-full pl-8 pr-4 py-1.5 text-sm bg-muted/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/50 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 font-mono hidden group-focus-within:block">⌘K</kbd>
        </div>
        
        {isOpen && filtered.length > 0 && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-popover border border-border rounded-xl shadow-xl shadow-black/20 z-50 overflow-hidden">
            <div className="p-1.5 space-y-0.5">
              {filtered.map(p => (
                <button
                  key={p.slug}
                  onMouseDown={() => handleNav(p.slug)}
                  className="w-full flex flex-col px-3 py-2.5 text-left hover:bg-muted rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{p.title}</span>
                  <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

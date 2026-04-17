"use client";

import { useState } from "react";
import { Search, ChevronRight, Sparkles, Command } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

const DOC_PAGES = [
  { slug: "overview",      title: "Overview",              description: "What FRIDAY is and core features" },
  { slug: "vision",        title: "Vision & Mission",      description: "Agentic web mission and roadmap" },
  { slug: "architecture",  title: "Platform Architecture", description: "Modules, MCP, tRPC, LLM, pgvector" },
  { slug: "pm",            title: "FRIDAY PM",             description: "Issue tracking, Gantt, and sprints" },
  { slug: "traces",        title: "FRIDAY Traces",         description: "LLM observability and Langfuse" },
  { slug: "agents",        title: "Agents & MCP",          description: "Agent execution, tools, and custom code" },
  { slug: "integrations",  title: "Integrations",          description: "Email, Calendar, GitHub webhooks" },
  { slug: "getting-started", title: "Getting Started",     description: "Setup project and invite team" },
];

export function DocsHeader() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();

  // Determine current page from pathname
  const currentSlug = pathname.split("/").pop();
  const currentPage = DOC_PAGES.find(p => p.slug === currentSlug) || DOC_PAGES[0];

  const filtered = query.trim().length >= 2
    ? DOC_PAGES.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleNav = (slug: string) => {
    trackEvent("docs.click", { slug } as any);
    router.push(`/${locale}/docs/${slug}`);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center px-8 gap-6 shrink-0 sticky top-0 z-40 supports-[backdrop-filter]:bg-background/60">
      
      {/* Breadcrumbs */}
      <nav className="text-sm font-medium text-muted-foreground flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-top-2">
        <span className="text-zinc-500 hover:text-zinc-300 transition-colors">Docs</span>
        <ChevronRight size={14} className="text-zinc-700" />
        <span className="text-foreground drop-shadow-sm">{currentPage?.title}</span>
      </nav>

      {/* Global Command Hint */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground mr-2 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50 shadow-inner">
        <Sparkles size={12} className="text-primary/70" />
        <span>Ask FRIDAY anywhere</span>
        <div className="flex items-center gap-0.5 opacity-60">
          <kbd className="font-sans px-1 bg-background rounded shadow-sm border border-border">⌘</kbd>
          <kbd className="font-sans px-1 bg-background rounded shadow-sm border border-border">K</kbd>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-80 animate-in fade-in slide-in-from-top-2 delay-100">
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
          <input
            value={query}
            onChange={e => { 
                setQuery(e.target.value); 
                setIsOpen(true); 
                if (e.target.value.length > 2) trackEvent("docs.search", { query: e.target.value } as any); 
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            placeholder="Search documentation..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/40 border border-border/60 hover:border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/70 transition-all shadow-sm"
          />
          <Command size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
        
        {isOpen && filtered.length > 0 && (
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-popover border border-border/80 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95">
            <div className="p-2 space-y-1">
              {filtered.map(p => (
                <button
                  key={p.slug}
                  onMouseDown={() => handleNav(p.slug)}
                  className="w-full flex items-center px-3 py-3 text-left hover:bg-muted rounded-lg transition-colors group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{p.title}</span>
                    <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-muted/50 p-2 text-center border-t border-border/50">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Press Enter to navigate</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

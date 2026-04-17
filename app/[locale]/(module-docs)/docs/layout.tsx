import React from "react";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsHeader } from "@/components/docs/DocsHeader";

export const metadata = {
  title: "FRIDAY Docs",
  description: "Platform documentation, architecture reference, and feature guides for F.R.I.D.A.Y.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden selection:bg-primary/30 selection:text-primary-foreground">
      {/* Decorative ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <DocsSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10 w-full isolate">
        <DocsHeader />
        <main className="flex-1 overflow-y-auto scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}

import React from "react";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsHeader } from "@/components/docs/DocsHeader";

export const metadata = {
  title: "FRIDAY Docs",
  description: "Platform documentation, architecture reference, and feature guides for F.R.I.D.A.Y.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden">
      <DocsSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <DocsHeader />
        <main className="flex-1 overflow-y-auto scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}

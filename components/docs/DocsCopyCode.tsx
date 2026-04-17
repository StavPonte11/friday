"use client";
import React, { useState, useRef } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export function DocsCopyCode({ children, className, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    const text = preRef.current?.textContent ?? "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-zinc-500" />
          <div className="flex gap-1.5 ml-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          {copied ? <><Check size={12} className="text-green-400" /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre
        ref={preRef}
        {...props}
        className={cn("p-4 overflow-x-auto text-sm leading-relaxed text-zinc-300 font-mono focus:outline-none scrollbar-thin scrollbar-thumb-zinc-800", className)}
      >
        {children}
      </pre>
    </div>
  );
}

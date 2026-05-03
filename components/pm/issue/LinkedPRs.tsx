"use client";

import { GitBranch, GitMerge, GitPullRequest, X, ExternalLink, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { GitPrStatus } from "@prisma/client";

const STATUS_CONFIG: Record<GitPrStatus, { label: string; color: string; icon: React.ReactNode }> = {
  OPEN: { label: "Open", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: <GitPullRequest className="w-3 h-3" /> },
  MERGED: { label: "Merged", color: "text-purple-400 bg-purple-400/10 border-purple-400/20", icon: <GitMerge className="w-3 h-3" /> },
  CLOSED: { label: "Closed", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: <X className="w-3 h-3" /> },
  DRAFT: { label: "Draft", color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20", icon: <GitBranch className="w-3 h-3" /> },
};

interface Props {
  issueId: string;
}

export function LinkedPRs({ issueId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState("");

  const { data: links = [], refetch } = trpc.pmGit.listLinks.useQuery({ issueId });
  const unlinkMutation = trpc.pmGit.unlinkPR.useMutation({ onSuccess: () => refetch() });
  const manualLinkMutation = trpc.pmGit.manualLink.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setPrUrl(""); },
  });

  function parsePrUrl(url: string) {
    try {
      const u = new URL(url);
      const githubMatch = u.pathname.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)/);
      const gitlabMatch = u.pathname.match(/^\/([^/]+\/[^/]+)\/-\/merge_requests\/(\d+)/);
      if (githubMatch) return { provider: "github" as const, repoName: githubMatch[1], prNumber: parseInt(githubMatch[2]) };
      if (gitlabMatch) return { provider: "gitlab" as const, repoName: gitlabMatch[1], prNumber: parseInt(gitlabMatch[2]) };
    } catch {}
    return null;
  }

  async function handleManualLink() {
    setUrlError("");
    const parsed = parsePrUrl(prUrl);
    if (!parsed) {
      setUrlError("Enter a valid GitHub PR or GitLab MR URL");
      return;
    }
    setSubmitting(true);
    try {
      await manualLinkMutation.mutateAsync({ issueId, ...parsed, prUrl });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Linked PRs / MRs</h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Link PR
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <input
            type="url"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/org/repo/pull/123"
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          {urlError && <p className="text-xs text-red-400">{urlError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleManualLink}
              disabled={submitting || !prUrl}
              className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
            >
              {submitting ? "Linking…" : "Link"}
            </button>
            <button
              onClick={() => { setShowForm(false); setPrUrl(""); setUrlError(""); }}
              className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {links.length === 0 && !showForm && (
        <p className="text-xs text-zinc-500 italic">No linked pull requests.</p>
      )}

      <div className="space-y-2">
        {links.map((link) => {
          const cfg = STATUS_CONFIG[link.status] ?? STATUS_CONFIG.OPEN;
          return (
            <div
              key={link.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/50 group"
            >
              <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium ${cfg.color}`}>
                {cfg.icon}
                {cfg.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{link.prTitle ?? `#${link.prNumber}`}</p>
                <p className="text-xs text-zinc-500 truncate">{link.repoName} #{link.prNumber}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={link.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => unlinkMutation.mutate({ linkId: link.id })}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

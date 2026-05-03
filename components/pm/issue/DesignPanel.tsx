"use client";

import { Figma, ExternalLink, X, Plus, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

interface Props {
  issueId: string;
}

export function DesignPanel({ issueId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: links = [], refetch } = trpc.pmDesign.listLinks.useQuery({ issueId });
  const attachMutation = trpc.pmDesign.attachDesign.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); setFigmaUrl(""); setError(""); },
    onError: (err: any) => setError(err.message),
  });
  const removeMutation = trpc.pmDesign.removeDesign.useMutation({ onSuccess: () => refetch() });

  async function handleAttach() {
    if (!figmaUrl.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await attachMutation.mutateAsync({ issueId, url: figmaUrl });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Designs</h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Attach Figma
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <input
            type="url"
            value={figmaUrl}
            onChange={(e) => { setFigmaUrl(e.target.value); setError(""); }}
            placeholder="https://www.figma.com/file/..."
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAttach}
              disabled={submitting || !figmaUrl.trim()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-[#6366F1] hover:bg-[#4F46E5] text-white disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Figma className="w-3 h-3" />}
              {submitting ? "Attaching…" : "Attach"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFigmaUrl(""); setError(""); }}
              className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {links.length === 0 && !showForm && (
        <p className="text-xs text-zinc-500 italic">No Figma designs linked.</p>
      )}

      <div className="space-y-3">
        {links.map((link) => (
          <DesignLinkCard
            key={link.id}
            link={link}
            onRemove={() => removeMutation.mutate({ linkId: link.id })}
          />
        ))}
      </div>
    </div>
  );
}

interface DesignLinkCardProps {
  link: { id: string; url: string; title?: string | null; fileId: string; nodeId?: string | null };
  onRemove: () => void;
}

function DesignLinkCard({ link, onRemove }: DesignLinkCardProps) {
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Build the embed URL on the client via the proxy endpoint
  const embedApiUrl = `/api/integrations/figma/embed?url=${encodeURIComponent(link.url)}`;

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 overflow-hidden group">
      {/* Header */}
      <div className="flex items-center gap-2 p-2.5">
        <div className="w-6 h-6 rounded bg-[#1E1E1E] flex items-center justify-center flex-shrink-0">
          <Figma className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200 truncate font-medium">
            {link.title ?? link.fileId}
          </p>
          {link.nodeId && (
            <p className="text-xs text-zinc-500">Node: {link.nodeId}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
          >
            {expanded ? "Hide" : "Preview"}
          </button>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Embed preview */}
      {expanded && (
        <div className="border-t border-zinc-700/50">
          {embedError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-zinc-500">
              <AlertCircle className="w-5 h-5 text-zinc-600" />
              <p className="text-xs">Preview unavailable — open in Figma</p>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Open in Figma →
              </a>
            </div>
          ) : (
            <div className="relative">
              {!embedLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                </div>
              )}
              <FigmaEmbed
                embedApiUrl={embedApiUrl}
                figmaUrl={link.url}
                onLoad={() => setEmbedLoaded(true)}
                onError={() => setEmbedError(true)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FigmaEmbed({
  embedApiUrl,
  figmaUrl,
  onLoad,
  onError,
}: {
  embedApiUrl: string;
  figmaUrl: string;
  onLoad: () => void;
  onError: () => void;
}) {
  const [data, setData] = useState<{ embedUrl: string; accessible: boolean } | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // Fetch embed metadata on mount
  useState(() => {
    fetch(embedApiUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setData(d as { embedUrl: string; accessible: boolean }))
      .catch(() => { setFetchError(true); onError(); });
  });

  if (fetchError) return null;

  if (!data) return (
    <div className="flex items-center justify-center h-16">
      <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
    </div>
  );

  if (!data.accessible) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-zinc-500">
        <AlertCircle className="w-5 h-5 text-zinc-600" />
        <p className="text-xs text-center px-4">
          You don&apos;t have access to this Figma file.{" "}
          <a
            href={figmaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Request access in Figma →
          </a>
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={data.embedUrl}
      className="w-full h-64 border-0 bg-zinc-900"
      allowFullScreen
      title="Figma Preview"
      onLoad={onLoad}
      onError={onError}
    />
  );
}

"use client";

import {
  Github,
  Calendar,
  Figma,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";

interface Provider {
  id: string;
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  type: string;
  docsUrl?: string;
  color: string;
}

const PROVIDERS: Provider[] = [
  {
    id: "google-calendar",
    key: "google",
    label: "Google Calendar",
    description: "Sync issue due dates and meetings to your Google Calendar. Changes flow in both directions.",
    icon: <Calendar className="w-5 h-5" />,
    type: "calendar",
    color: "from-blue-500 to-indigo-500",
  },
  {
    id: "outlook",
    key: "outlook",
    label: "Outlook Calendar",
    description: "Sync with Microsoft Outlook via MS Graph. Supports read/write events.",
    icon: <Calendar className="w-5 h-5" />,
    type: "calendar",
    color: "from-sky-500 to-blue-600",
  },
  {
    id: "github",
    key: "github",
    label: "GitHub",
    description: "Auto-link PRs to issues by mention. PR status syncs back to issue status.",
    icon: <Github className="w-5 h-5" />,
    type: "git",
    color: "from-zinc-600 to-zinc-800",
  },
  {
    id: "gitlab",
    key: "gitlab",
    label: "GitLab",
    description: "Auto-link Merge Requests to issues. MR status transitions update issue workflow.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.92z" />
      </svg>
    ),
    type: "git",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "figma",
    key: "figma",
    label: "Figma",
    description: "Attach Figma files and frames to issues. See live design previews right in FRIDAY.",
    icon: <Figma className="w-5 h-5" />,
    type: "design",
    color: "from-purple-500 to-pink-500",
  },
];

import { useState } from "react";

export default function IntegrationsSettingsPage() {
  const { data: session } = useSession();
  const { data: userIntegrations = [], refetch } = api.pmIntegrations.listUser.useQuery(
    { userId: session?.user?.id ?? "" },
    { enabled: !!session?.user?.id },
  );
  const disconnectMutation = api.pmIntegrations.disconnect.useMutation({
    onSuccess: () => refetch(),
  });

  const [activeModal, setActiveModal] = useState<Provider | null>(null);

  function isConnected(providerKey: string) {
    return userIntegrations.some((i) => i.provider === providerKey);
  }

  function getIntegration(providerKey: string) {
    return userIntegrations.find((i) => i.provider === providerKey);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Integrations</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Connect external tools to sync your work automatically.
        </p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const connected = isConnected(provider.key);
          const integration = getIntegration(provider.key);

          return (
            <div
              key={provider.id}
              className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${provider.color} flex items-center justify-center text-white flex-shrink-0`}
              >
                {provider.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100">{provider.label}</h3>
                  {connected ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                      <XCircle className="w-3 h-3" />
                      Not connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{provider.description}</p>
                {connected && integration && (
                  <p className="text-xs text-zinc-600 mt-1">
                    Connected on {new Date((integration as { createdAt: Date }).createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {connected && integration ? (
                  <button
                    onClick={() => disconnectMutation.mutate({ id: (integration as { id: string }).id })}
                    disabled={disconnectMutation.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-900/30 hover:text-red-400 hover:border-red-400/30 border border-zinc-700 text-zinc-400 transition-all disabled:opacity-50"
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Disconnect"
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveModal(provider)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-transparent transition-colors"
                  >
                    Connect
                  </button>
                )}
                {provider.docsUrl && (
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">Security Details</h3>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Tokens are stored securely using AES-256-GCM encryption and are never exposed to the client.
          Incoming webhooks are verified using HMAC-SHA256 signatures.
        </p>
      </div>

      {activeModal && (
        <ConnectionModal
          provider={activeModal}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            refetch();
            setActiveModal(null);
          }}
        />
      )}
    </div>
  );
}

function ConnectionModal({
  provider,
  onClose,
  onSuccess,
}: {
  provider: Provider;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const connectMutation = api.pmIntegrations.connect.useMutation({
    onSuccess,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await connectMutation.mutateAsync({
        type: provider.type as any,
        provider: provider.key,
        accessToken: token,
        metadata: url ? { instanceUrl: url } : {},
      });
    } finally {
      setSubmitting(false);
    }
  }

  const initiateOAuthMutation = api.pmIntegrations.initiateOAuth.useMutation({
    onSuccess: (data) => {
      // Redirect to the dynamic OAuth URL
      window.location.href = data.oauthUrl;
    },
  });

  async function handleOAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await initiateOAuthMutation.mutateAsync({
        type: provider.type as any,
        provider: provider.id,
        clientId: token, // repurposing token state for clientId
        clientSecret: url, // repurposing url state for clientSecret
      });
    } catch (err) {
      setSubmitting(false);
    }
  }

  const isOAuth = provider.key === "google" || provider.key === "outlook";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2 mb-2">
          {provider.icon} Connect {provider.label}
        </h3>
        <p className="text-sm text-zinc-400 mb-6">{provider.description}</p>

        {isOAuth ? (
          <form onSubmit={handleOAuthSubmit} className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400 leading-relaxed">
                Please provide your own OAuth App credentials. You must configure the redirect URI in your provider's console to:
                <br />
                <code className="text-blue-300 select-all mt-1 block font-mono bg-blue-900/30 px-2 py-1 rounded">
                  {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/auth/integrations/{provider.id}/callback
                </code>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Client ID
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your Client ID..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Client Secret
              </label>
              <input
                type="password"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter your Client Secret..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/50 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !token.trim() || !url.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Redirecting..." : "Authorize via " + provider.label}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {provider.key === "gitlab" && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Instance URL <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://gitlab.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Personal Access Token
              </label>
              <input
                type="password"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your token here..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
              />
              <p className="text-xs text-zinc-500 mt-1.5">
                Ensure your token has the correct scopes ({provider.key === "github" ? "repo, user" : provider.key === "gitlab" ? "api" : "file_read"}).
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/50 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !token.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Connecting..." : "Save Configuration"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

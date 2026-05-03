/**
 * Figma API Client
 * Fetches file info, node thumbnails, and validates Figma URLs.
 */

import { decryptAccessToken } from "../crypto";
import { prisma } from "@/lib/prisma";

const FIGMA_BASE = "https://api.figma.com/v1";

export interface FigmaFileInfo {
  name: string;
  thumbnailUrl?: string;
  lastModified: string;
}

export interface ParsedFigmaUrl {
  fileId: string;
  nodeId?: string;
  isValid: boolean;
}

/** Parse a Figma URL into fileId + optional nodeId */
export function parseFigmaUrl(url: string): ParsedFigmaUrl {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("figma.com")) return { fileId: "", isValid: false };

    // https://www.figma.com/file/{fileId}/{title}?node-id={nodeId}
    // https://www.figma.com/design/{fileId}/{title}?node-id={nodeId}
    const match = parsed.pathname.match(/\/(file|design|proto)\/([A-Za-z0-9_-]+)/);
    if (!match) return { fileId: "", isValid: false };

    const fileId = match[2];
    const nodeId = parsed.searchParams.get("node-id") ?? undefined;

    return { fileId, nodeId: nodeId ?? undefined, isValid: true };
  } catch {
    return { fileId: "", isValid: false };
  }
}

async function getUserToken(userId: string): Promise<string | null> {
  const integration = await prisma.integration.findFirst({
    where: { userId, provider: "figma", type: "design" },
  });
  if (!integration) return null;
  return decryptAccessToken(integration.accessToken);
}

/** Fetch Figma file metadata (name, thumbnail). Returns null if access denied. */
export async function getFigmaFileInfo(
  fileId: string,
  userId?: string,
): Promise<FigmaFileInfo | null> {
  // Try user token first; fall back to no-auth for public files
  const token = userId ? await getUserToken(userId) : null;

  const headers: Record<string, string> = token
    ? { "X-Figma-Token": token }
    : {};

  const res = await fetch(`${FIGMA_BASE}/files/${fileId}?depth=1`, { headers });

  if (res.status === 403 || res.status === 401) return null; // no access
  if (!res.ok) throw new Error(`[Figma] getFile failed: ${res.status}`);

  const data = await res.json() as {
    name: string;
    thumbnailUrl?: string;
    lastModified: string;
  };

  return {
    name: data.name,
    thumbnailUrl: data.thumbnailUrl,
    lastModified: data.lastModified,
  };
}

/** Build the Figma embed URL for iframe preview */
export function buildFigmaEmbedUrl(figmaUrl: string): string {
  return `https://www.figma.com/embed?embed_host=friday&url=${encodeURIComponent(figmaUrl)}`;
}

/** Validate a Figma personal access token */
export async function validateFigmaToken(accessToken: string): Promise<{ id: string; email: string; handle: string } | null> {
  const res = await fetch(`${FIGMA_BASE}/me`, {
    headers: { "X-Figma-Token": accessToken },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; email: string; handle: string }>;
}

/**
 * Figma Embed Proxy
 * GET /api/integrations/figma/embed?url=...
 *
 * Returns the Figma embed URL for an iframe. Validates the Figma URL first.
 * If the user has a connected Figma account, attempts to verify access.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseFigmaUrl, buildFigmaEmbedUrl, getFigmaFileInfo } from "@/lib/integrations/figma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const parsed = parseFigmaUrl(url);
  if (!parsed.isValid) {
    return NextResponse.json({ error: "Invalid Figma URL" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Try to get file info — returns null if no access
  let fileInfo = null;
  try {
    fileInfo = await getFigmaFileInfo(parsed.fileId, userId);
  } catch {
    // Non-fatal — embed might still work for public files
  }

  const embedUrl = buildFigmaEmbedUrl(url);

  return NextResponse.json({
    embedUrl,
    fileId: parsed.fileId,
    nodeId: parsed.nodeId,
    accessible: fileInfo !== null,
    title: fileInfo?.name ?? null,
    thumbnailUrl: fileInfo?.thumbnailUrl ?? null,
  });
}

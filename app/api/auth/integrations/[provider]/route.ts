/**
 * OAuth Integration Routes
 * GET /api/auth/integrations/[provider]
 *
 * Redirects the user to the provider's OAuth authorization URL.
 * Supported providers: google-calendar, outlook, github, gitlab, figma
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

const OAUTH_CONFIGS: Record<
  string,
  { authUrl: string; clientId: string; scopes: string[] }
> = {
  "google-calendar": {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    scopes: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  },
  outlook: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    clientId: process.env.OUTLOOK_CLIENT_ID || "",
    scopes: [
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "offline_access",
    ],
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    clientId: process.env.GITHUB_INTEGRATION_CLIENT_ID || "",
    scopes: ["repo", "read:user"],
  },
  gitlab: {
    authUrl: "https://gitlab.com/oauth/authorize",
    clientId: process.env.GITLAB_CLIENT_ID || "",
    scopes: ["api", "read_user"],
  },
  figma: {
    authUrl: "https://www.figma.com/oauth",
    clientId: process.env.FIGMA_CLIENT_ID || "",
    scopes: ["file_read"],
  },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await params;
  const config = OAUTH_CONFIGS[provider];

  if (!config) {
    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  }

  if (!config.clientId) {
    return NextResponse.json(
      { error: `Provider ${provider} is not configured` },
      { status: 503 },
    );
  }

  const redirectUri = `${BASE_URL}/api/auth/integrations/${provider}/callback`;

  // Store state in a short-lived cookie to prevent CSRF
  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, ts: Date.now() }),
  ).toString("base64url");

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  // Provider-specific extras
  if (provider === "google-calendar") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  const response = NextResponse.redirect(url.toString());
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 min
    path: "/",
  });

  return response;
}

/**
 * OAuth Callback Route
 * GET /api/auth/integrations/[provider]/callback
 *
 * Exchanges the authorization code for tokens, encrypts and stores them,
 * then redirects the user back to the integrations settings page.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { connectIntegration } from "@/lib/integrations/service";
import { traceIntegrationEvent } from "@/lib/integrations/analytics";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

interface TokenExchangeResult {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

const TOKEN_ENDPOINTS: Record<string, string> = {
  "google-calendar": "https://oauth2.googleapis.com/token",
  outlook: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  github: "https://github.com/login/oauth/access_token",
  gitlab: "https://gitlab.com/oauth/token",
  figma: "https://www.figma.com/api/oauth/token",
};

const PROVIDER_TO_TYPE: Record<string, string> = {
  "google-calendar": "calendar",
  outlook: "calendar",
  github: "git",
  gitlab: "git",
  figma: "design",
};

const PROVIDER_NORMALIZED: Record<string, string> = {
  "google-calendar": "google",
  outlook: "outlook",
  github: "github",
  gitlab: "gitlab",
  figma: "figma",
};

async function exchangeCodeForTokens(
  provider: string,
  code: string,
  clientId: string,
  clientSecret: string
): Promise<TokenExchangeResult> {
  const tokenUrl = TOKEN_ENDPOINTS[provider];
  const redirectUri = `${BASE_URL}/api/auth/integrations/${provider}/callback`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed for ${provider}: ${res.status} ${text}`);
  }

  return res.json() as Promise<TokenExchangeResult>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(`${BASE_URL}/login?error=unauthorized`);
  }

  const { provider } = await params;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Provider returned an error (e.g. user denied)
  if (error) {
    console.warn(`[OAuth Callback] ${provider} returned error: ${error}`);
    return NextResponse.redirect(
      `${BASE_URL}/settings/integrations?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/settings/integrations?error=missing_code`);
  }

  // Validate CSRF state
  const cookieState = req.cookies.get("oauth_state")?.value;
  if (!state || state !== cookieState) {
    return NextResponse.redirect(`${BASE_URL}/settings/integrations?error=invalid_state`);
  }

  const redirectSuccess = `${BASE_URL}/settings/integrations?connected=${provider}`;
  const redirectError = `${BASE_URL}/settings/integrations?error=token_exchange_failed`;

  try {
    const { prisma } = await import("@/lib/prisma");
    const { decryptAccessToken, encryptAccessToken } = await import("@/lib/integrations/crypto");

    // 1. Fetch pending integration containing secrets
    const pendingIntegration = await prisma.integration.findFirst({
      where: { 
        userId: session.user.id, 
        provider: PROVIDER_NORMALIZED[provider] ?? provider,
        accessToken: "pending" 
      },
      orderBy: { createdAt: "desc" },
    });

    if (!pendingIntegration || !pendingIntegration.metadata) {
      throw new Error("No pending integration setup found. Please initiate connection again.");
    }

    const meta = pendingIntegration.metadata as any;
    const clientId = decryptAccessToken(meta.clientId);
    const clientSecret = decryptAccessToken(meta.clientSecret);

    // 2. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(provider, code, clientId, clientSecret);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // 3. Update the pending integration with real tokens
    await prisma.integration.update({
      where: { id: pendingIntegration.id },
      data: {
        accessToken: encryptAccessToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptAccessToken(tokens.refresh_token) : null,
        expiresAt,
        metadata: {
          scope: tokens.scope,
          connectedAt: new Date().toISOString(),
          // Purposely do not save clientId/clientSecret here for security
        }
      }
    });

    traceIntegrationEvent("integration.connected", {
      userId: session.user.id,
      provider: PROVIDER_NORMALIZED[provider] ?? provider,
      type: PROVIDER_TO_TYPE[provider] ?? "unknown",
    });

    const response = NextResponse.redirect(redirectSuccess);
    // Clear the state cookie
    response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (err) {
    console.error(`[OAuth Callback] Token exchange error for ${provider}:`, err);
    traceIntegrationEvent("integration.error", {
      userId: session.user.id,
      provider: PROVIDER_NORMALIZED[provider] ?? provider,
      type: PROVIDER_TO_TYPE[provider] ?? "unknown",
      error: String(err),
    });
    return NextResponse.redirect(redirectError);
  }
}

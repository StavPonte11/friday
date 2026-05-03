/**
 * Microsoft Outlook Calendar Client (via MS Graph API)
 * Wraps Graph API v1.0 using the stored OAuth access token.
 */

import { decryptAccessToken, encryptAccessToken } from "../crypto";
import { prisma } from "@/lib/prisma";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export interface OutlookCalendarEvent {
  id?: string;
  subject: string;
  body?: { contentType: "HTML" | "Text"; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

async function refreshOutlookToken(integrationId: string, refreshToken: string): Promise<string> {
  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
    }),
  });

  if (!res.ok) throw new Error(`[Outlook] Token refresh failed: ${res.status}`);

  const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      accessToken: encryptAccessToken(data.access_token),
      ...(data.refresh_token ? { refreshToken: encryptAccessToken(data.refresh_token) } : {}),
      expiresAt,
    },
  });

  return data.access_token;
}

async function getValidToken(integrationId: string): Promise<string> {
  const integration = await prisma.integration.findUniqueOrThrow({
    where: { id: integrationId },
  });

  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (integration.expiresAt && integration.expiresAt.getTime() - now.getTime() < bufferMs) {
    if (!integration.refreshToken) throw new Error("[Outlook] No refresh token available");
    const decryptedRefresh = decryptAccessToken(integration.refreshToken);
    return refreshOutlookToken(integrationId, decryptedRefresh);
  }

  return decryptAccessToken(integration.accessToken);
}

export async function createOutlookCalendarEvent(
  integrationId: string,
  event: OutlookCalendarEvent,
): Promise<{ id: string }> {
  const token = await getValidToken(integrationId);

  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) throw new Error(`[Outlook] createEvent failed: ${await res.text()}`);
  return res.json() as Promise<{ id: string }>;
}

export async function updateOutlookCalendarEvent(
  integrationId: string,
  eventId: string,
  patch: Partial<OutlookCalendarEvent>,
): Promise<void> {
  const token = await getValidToken(integrationId);

  const res = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) throw new Error(`[Outlook] updateEvent failed: ${await res.text()}`);
}

export async function deleteOutlookCalendarEvent(
  integrationId: string,
  eventId: string,
): Promise<void> {
  const token = await getValidToken(integrationId);

  const res = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`[Outlook] deleteEvent failed: ${await res.text()}`);
  }
}

export async function getOutlookCalendarEvent(
  integrationId: string,
  eventId: string,
): Promise<OutlookCalendarEvent & { id: string; lastModifiedDateTime: string }> {
  const token = await getValidToken(integrationId);

  const res = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`[Outlook] getEvent failed: ${await res.text()}`);
  return res.json() as Promise<OutlookCalendarEvent & { id: string; lastModifiedDateTime: string }>;
}

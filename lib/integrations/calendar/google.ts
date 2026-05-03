/**
 * Google Calendar API Client
 * Wraps the Google Calendar REST API v3 using the stored OAuth access token.
 */

import { decryptAccessToken, encryptAccessToken } from "../crypto";
import { prisma } from "@/lib/prisma";

const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  reminders?: { useDefault: boolean };
}

async function refreshGoogleToken(integrationId: string, refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error(`[GoogleCalendar] Token refresh failed: ${res.status}`);

  const data = await res.json() as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      accessToken: encryptAccessToken(data.access_token),
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
  const bufferMs = 5 * 60 * 1000; // 5-minute buffer

  if (integration.expiresAt && integration.expiresAt.getTime() - now.getTime() < bufferMs) {
    if (!integration.refreshToken) throw new Error("[GoogleCalendar] No refresh token available");
    const decryptedRefresh = decryptAccessToken(integration.refreshToken);
    return refreshGoogleToken(integrationId, decryptedRefresh);
  }

  return decryptAccessToken(integration.accessToken);
}

export async function createGoogleCalendarEvent(
  integrationId: string,
  calendarId: string,
  event: GoogleCalendarEvent,
): Promise<{ id: string }> {
  const token = await getValidToken(integrationId);

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );

  if (!res.ok) throw new Error(`[GoogleCalendar] createEvent failed: ${await res.text()}`);
  return res.json() as Promise<{ id: string }>;
}

export async function updateGoogleCalendarEvent(
  integrationId: string,
  calendarId: string,
  eventId: string,
  patch: Partial<GoogleCalendarEvent>,
): Promise<void> {
  const token = await getValidToken(integrationId);

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    },
  );

  if (!res.ok) throw new Error(`[GoogleCalendar] updateEvent failed: ${await res.text()}`);
}

export async function deleteGoogleCalendarEvent(
  integrationId: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const token = await getValidToken(integrationId);

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok && res.status !== 410) {
    // 410 = already deleted — treat as success
    throw new Error(`[GoogleCalendar] deleteEvent failed: ${await res.text()}`);
  }
}

export async function getGoogleCalendarEvent(
  integrationId: string,
  calendarId: string,
  eventId: string,
): Promise<GoogleCalendarEvent & { id: string; updated: string }> {
  const token = await getValidToken(integrationId);

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) throw new Error(`[GoogleCalendar] getEvent failed: ${await res.text()}`);
  return res.json() as Promise<GoogleCalendarEvent & { id: string; updated: string }>;
}

/** Register a push notification channel for a calendar */
export async function watchGoogleCalendar(
  integrationId: string,
  calendarId: string,
  webhookUrl: string,
  channelId: string,
): Promise<{ expiration: string }> {
  const token = await getValidToken(integrationId);

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in ms
      }),
    },
  );

  if (!res.ok) throw new Error(`[GoogleCalendar] watchCalendar failed: ${await res.text()}`);
  return res.json() as Promise<{ expiration: string }>;
}

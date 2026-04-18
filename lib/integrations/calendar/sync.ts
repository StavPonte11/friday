import { prisma } from "@/lib/prisma";
import { decryptAccessToken } from "../crypto";

// Example payload for syncing
export interface SyncEventParams {
    userId: string;
    issueId: string;
    title: string;
    description: string;
    startDate: Date;
    dueDate: Date;
}

export async function syncIssueToCalendar(params: SyncEventParams) {
    // 1. Get calendar integration for user
    const integration = await prisma.integration.findFirst({
        where: { userId: params.userId, type: "calendar" },
    });

    if (!integration) {
        throw new Error("No calendar integration found for user.");
    }

    const token = decryptAccessToken(integration.accessToken);

    // 2. Determine provider and sync
    if (integration.provider === "google") {
        // Pseudo-logic for google api
        console.log("Syncing to Google Calendar with token", token.slice(0,5) + "...");
    } else if (integration.provider === "outlook") {
        // Pseudo-logic for outlook api
        console.log("Syncing to Outlook Calendar...");
    }

    // 3. Keep metadata matching event ID <-> issue ID
    const currentMeta = (integration.metadata as any) || {};
    const eventsMap = currentMeta.eventsMap || {};
    eventsMap[params.issueId] = `ext-event-${Date.now()}`; // The external ID

    await prisma.integration.update({
        where: { id: integration.id },
        data: {
            metadata: { ...currentMeta, eventsMap },
        },
    });

    return true;
}

export async function removeIssueFromCalendar(userId: string, issueId: string) {
    const integration = await prisma.integration.findFirst({
        where: { userId, type: "calendar" },
    });

    if (!integration) return;

    const currentMeta = (integration.metadata as any) || {};
    if (currentMeta.eventsMap && currentMeta.eventsMap[issueId]) {
        // Call provider API to delete event
        delete currentMeta.eventsMap[issueId];
        await prisma.integration.update({
            where: { id: integration.id },
            data: { metadata: currentMeta },
        });
    }
}

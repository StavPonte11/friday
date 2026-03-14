import { prisma } from "@/lib/prisma";

export type NotificationType =
    | "issue_assigned"
    | "issue_updated"
    | "comment_added"
    | "mentioned"
    | "sprint_started"
    | "sprint_completed"
    | "issue_linked";

export interface NotificationPayload {
    issueId?: string;
    issueKey?: string;
    issueTitle?: string;
    sprintId?: string;
    sprintName?: string;
    commentId?: string;
    actorName?: string;
    projectId?: string;
    [key: string]: string | undefined;
}

/**
 * Create a notification for a user.
 * Designed to be called fire-and-forget (don't await unless necessary).
 */
export async function notify(
    userId: string,
    type: NotificationType,
    title: string,
    payload?: NotificationPayload
): Promise<void> {
    try {
        await prisma.pmNotification.create({
            data: {
                userId,
                type,
                title,
                payload: payload ?? {}
            }
        });
    } catch (err) {
        // Non-critical: log but don't throw
        console.error("[NotificationService] Failed to create notification:", err);
    }

    // Trigger email notification (fire-and-forget)
    sendEmailNotification(userId, title, "New notification in FRIDAY PM").catch(err => 
        console.error("[NotificationService] Email stub failed:", err)
    );
}

/**
 * Notify multiple users at once.
 */
export async function notifyMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    payload?: NotificationPayload
): Promise<void> {
    const unique = [...new Set(userIds)];
    await Promise.all(unique.map(id => notify(id, type, title, payload)));
}

/**
 * Stub for email notifications.
 * To be replaced with Resend/SendGrid/Nodemailer later.
 */
export async function sendEmailNotification(
    userId: string,
    subject: string,
    body: string
): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
    });

    if (user?.email) {
        console.log(`[EMAIL STUB] Sending to ${user.name} <${user.email}>:`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body}`);
        console.log("------------------------------------------");
    }
}

/**
 * Parse @mentions from comment content and return matched user IDs.
 * Pattern: @username or @firstname.lastname
 */
export function extractMentions(content: string): string[] {
    const regex = /@([a-zA-Z0-9._-]+)/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        matches.push(match[1]);
    }
    return [...new Set(matches)];
}

/**
 * Resolve mention handles to user IDs by looking up names/emails.
 * Returns a map of handle → userId for matched users.
 */
export async function resolveMentions(
    handles: string[],
    workspaceId?: string
): Promise<Map<string, string>> {
    if (handles.length === 0) return new Map();

    const users = await prisma.user.findMany({
        where: {
            OR: handles.map(h => ({
                OR: [
                    { email: { startsWith: h, mode: "insensitive" as const } },
                    { name: { contains: h, mode: "insensitive" as const } }
                ]
            }))
        },
        select: { id: true, name: true, email: true }
    });

    const map = new Map<string, string>();
    for (const handle of handles) {
        const match = users.find(u =>
            u.email?.toLowerCase().startsWith(handle.toLowerCase()) ||
            u.name?.toLowerCase().includes(handle.toLowerCase())
        );
        if (match) map.set(handle, match.id);
    }
    return map;
}

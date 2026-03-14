import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import * as crypto from "crypto";

export const pmWebhooksRouter = router({
    list: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmWebhook.findMany({ where: { projectId: input.projectId }, orderBy: { createdAt: "desc" } });
        }),

    create: publicProcedure
        .input(z.object({
            projectId: z.string(),
            name: z.string().min(1),
            url: z.string().url(),
            events: z.array(z.enum(["issue.created", "issue.updated", "sprint.started", "sprint.completed", "comment.added"])),
            active: z.boolean().default(true),
        }))
        .mutation(async ({ input }) => {
            const secret = crypto.randomBytes(24).toString("hex");
            return prisma.pmWebhook.create({
                data: { ...input, events: input.events, secret }
            });
        }),

    update: publicProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            url: z.string().url().optional(),
            events: z.array(z.string()).optional(),
            active: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            return prisma.pmWebhook.update({ where: { id }, data });
        }),

    delete: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            await prisma.pmWebhook.delete({ where: { id: input.id } });
            return { success: true };
        }),

    test: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            const webhook = await prisma.pmWebhook.findUnique({ where: { id: input.id } });
            if (!webhook) throw new Error("Webhook not found");

            const payload = { event: "test", timestamp: new Date().toISOString(), message: "FRIDAY webhook test" };
            const body = JSON.stringify(payload);
            const signature = webhook.secret
                ? `sha256=${crypto.createHmac("sha256", webhook.secret).update(body).digest("hex")}`
                : undefined;

            try {
                const res = await fetch(webhook.url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-FRIDAY-Event": "test",
                        ...(signature ? { "X-FRIDAY-Signature": signature } : {}),
                    },
                    body,
                });
                return { success: res.ok, status: res.status, statusText: res.statusText };
            } catch (err) {
                return { success: false, error: String(err) };
            }
        }),
});

/**
 * Dispatch a webhook event to all active webhooks for a project.
 * Called by other services (fire-and-forget).
 */
export async function dispatchWebhook(
    projectId: string,
    event: string,
    payload: Record<string, unknown>
): Promise<void> {
    const webhooks = await prisma.pmWebhook.findMany({
        where: { projectId, active: true }
    });

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload });

    await Promise.allSettled(webhooks.filter((w: { events: unknown }) => {
        const events = Array.isArray(w.events) ? (w.events as string[]) : [];
        return events.includes(event) || events.includes("*");
    }).map(async (webhook: { url: string; secret: string | null }) => {
        const signature = webhook.secret
            ? `sha256=${crypto.createHmac("sha256", webhook.secret).update(body).digest("hex")}`
            : undefined;

        await fetch(webhook.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-FRIDAY-Event": event,
                ...(signature ? { "X-FRIDAY-Signature": signature } : {}),
            },
            body,
        });
    }));
}

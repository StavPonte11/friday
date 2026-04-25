import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { auditLog } from "@/lib/audit";

export const adminInvitesRouter = router({
    list: adminProcedure
        .input(z.object({
            workspaceId: z.string()
        }))
        .query(async ({ input }) => {
            return prisma.workspaceInvite.findMany({
                where: { workspaceId: input.workspaceId },
                include: {
                    invitedBy: { select: { id: true, name: true, email: true, image: true } }
                },
                orderBy: { createdAt: "desc" }
            });
        }),

    create: adminProcedure
        .input(z.object({
            workspaceId: z.string(),
            email: z.string().email(),
            role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).default("MEMBER")
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if already member
            const existingMember = await prisma.workspaceMember.findFirst({
                where: { workspaceId: input.workspaceId, user: { email: input.email } }
            });

            if (existingMember) {
                throw new TRPCError({ code: "CONFLICT", message: "User is already a member of this workspace" });
            }

            // Check if active invite exists
            const existingInvite = await prisma.workspaceInvite.findFirst({
                where: { workspaceId: input.workspaceId, email: input.email, status: "PENDING" }
            });

            if (existingInvite) {
                throw new TRPCError({ code: "CONFLICT", message: "User already has a pending invite" });
            }

            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            const invite = await prisma.workspaceInvite.create({
                data: {
                    email: input.email,
                    workspaceId: input.workspaceId,
                    role: input.role,
                    token,
                    expiresAt,
                    invitedById: ctx.session.user.id
                }
            });

            auditLog({
                action: "invite.created",
                entityType: "WorkspaceInvite",
                entityId: invite.id,
                userId: ctx.session.user.id,
                workspaceId: input.workspaceId,
                details: { email: input.email, role: input.role }
            });

            // TODO: In production, trigger Email sending service here.
            console.log(`[DEV ONLY] Invite Link: http://localhost:3000/en/invite/${token}`);

            return invite;
        }),

    revoke: adminProcedure
        .input(z.object({
            workspaceId: z.string(),
            inviteId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const invite = await prisma.workspaceInvite.findFirst({
                where: { id: input.inviteId, workspaceId: input.workspaceId }
            });

            if (!invite) throw new TRPCError({ code: "NOT_FOUND" });

            await prisma.workspaceInvite.update({
                where: { id: invite.id },
                data: { status: "REVOKED" }
            });

            auditLog({
                action: "invite.revoked",
                entityType: "WorkspaceInvite",
                entityId: invite.id,
                userId: ctx.session.user.id,
                workspaceId: input.workspaceId
            });

            return { success: true };
        }),

    validate: protectedProcedure
        .input(z.object({ token: z.string() }))
        .query(async ({ input }) => {
            const invite = await prisma.workspaceInvite.findUnique({
                where: { token: input.token },
                include: { workspace: { select: { id: true, name: true, logoUrl: true } } }
            });

            if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite link" });
            if (invite.status !== "PENDING") throw new TRPCError({ code: "BAD_REQUEST", message: "Invite is no longer active" });
            if (invite.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has expired" });

            return invite;
        }),

    accept: protectedProcedure
        .input(z.object({ token: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const invite = await prisma.workspaceInvite.findUnique({
                where: { token: input.token }
            });

            if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
            if (invite.status !== "PENDING") throw new TRPCError({ code: "BAD_REQUEST" });
            if (invite.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has expired" });
            if (invite.email !== ctx.session.user.email) throw new TRPCError({ code: "FORBIDDEN", message: "Invite email mismatch" });

            // Create member
            await prisma.$transaction([
                prisma.workspaceMember.create({
                    data: {
                        userId: ctx.session.user.id,
                        workspaceId: invite.workspaceId,
                        role: invite.role
                    }
                }),
                prisma.workspaceInvite.update({
                    where: { id: invite.id },
                    data: { status: "ACCEPTED" }
                })
            ]);

            auditLog({
                action: "invite.accepted",
                entityType: "WorkspaceMember",
                entityId: ctx.session.user.id,
                userId: ctx.session.user.id,
                workspaceId: invite.workspaceId
            });

            return { success: true, workspaceId: invite.workspaceId };
        })
});

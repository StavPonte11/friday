import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../init";
import { 
    connectIntegration, 
    disconnectIntegration, 
    getUserIntegrations, 
    getWorkspaceIntegrations 
} from "@/lib/integrations/service";
import { importFromJira } from "@/lib/integrations/pm/jira-import";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";

export const pmIntegrationRouter = router({
    connect: protectedProcedure
        .input(z.object({
            workspaceId: z.string().optional(),
            type: z.enum(["calendar", "git", "pm", "design"]),
            provider: z.string(),
            accessToken: z.string(),
            refreshToken: z.string().optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;

            // If workspaceId provided, verify user is a member
            if (input.workspaceId) {
                const membership = await prisma.workspaceMember.findUnique({
                    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId } }
                });
                if (!membership) {
                    throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this workspace" });
                }
            }

            return await connectIntegration({ ...input, userId });
        }),

    initiateOAuth: protectedProcedure
        .input(z.object({
            type: z.enum(["calendar", "git", "pm", "design"]),
            provider: z.string(),
            clientId: z.string(),
            clientSecret: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            
            // Delete any existing pending integration for this provider
            await prisma.integration.deleteMany({
                where: { userId, provider: input.provider, accessToken: "pending" }
            });

            // We store the secrets temporarily in metadata (encryptAccessToken is AES-256-GCM)
            const { encryptAccessToken } = await import("@/lib/integrations/crypto");
            
            await connectIntegration({
                userId,
                type: input.type,
                provider: input.provider,
                accessToken: "pending", // mark as pending
                metadata: {
                    clientId: encryptAccessToken(input.clientId),
                    clientSecret: encryptAccessToken(input.clientSecret),
                }
            });

            const OAUTH_URLS: Record<string, string> = {
                "google-calendar": "https://accounts.google.com/o/oauth2/v2/auth",
                "outlook": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                "github": "https://github.com/login/oauth/authorize",
                "gitlab": "https://gitlab.com/oauth/authorize",
                "figma": "https://www.figma.com/oauth",
            };

            const SCOPES: Record<string, string[]> = {
                "google-calendar": ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"],
                "outlook": ["https://graph.microsoft.com/Calendars.ReadWrite", "offline_access"],
                "github": ["repo", "read:user"],
                "gitlab": ["api", "read_user"],
                "figma": ["file_read"],
            };

            const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
            const redirectUri = `${BASE_URL}/api/auth/integrations/${input.provider}/callback`;
            const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64url");

            const url = new URL(OAUTH_URLS[input.provider]);
            url.searchParams.set("client_id", input.clientId);
            url.searchParams.set("redirect_uri", redirectUri);
            url.searchParams.set("scope", SCOPES[input.provider].join(" "));
            url.searchParams.set("state", state);
            url.searchParams.set("response_type", "code");

            if (input.provider === "google-calendar") {
                url.searchParams.set("access_type", "offline");
                url.searchParams.set("prompt", "consent");
            }

            return { oauthUrl: url.toString() };
        }),

    disconnect: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            await disconnectIntegration(input.id);
            return { success: true };
        }),

    list: publicProcedure
        .input(z.object({ workspaceId: z.string() }))
        .query(async ({ input }) => {
            return await getWorkspaceIntegrations(input.workspaceId);
        }),

    listUser: publicProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ input }) => {
            return await getUserIntegrations(input.userId);
        }),

    /** Start a Jira import — returns a jobId for polling */
    triggerJiraImport: publicProcedure
        .input(z.object({
            integrationId: z.string(),
            projectId: z.string(),
            workspaceId: z.string(),
            jiraProjectKey: z.string().optional(),
            defaultAssigneeId: z.string().optional()
        }))
        .mutation(async ({ input }) => {
            return await importFromJira(input.integrationId, {
                projectId: input.projectId,
                workspaceId: input.workspaceId,
                jiraProjectKey: input.jiraProjectKey,
                defaultAssigneeId: input.defaultAssigneeId
            });
        }),

    /** Poll the status of an import job */
    importJobStatus: publicProcedure
        .input(z.object({ jobId: z.string() }))
        .query(async ({ input }) => {
            const job = await prisma.pmImportJob.findUnique({ where: { id: input.jobId } });
            if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Import job not found" });
            return {
                id: job.id,
                status: job.status,
                progress: job.progress,
                total: job.total,
                importedCount: job.importedCount,
                error: job.error,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
            };
        }),

    /** List import jobs for a workspace */
    listImportJobs: publicProcedure
        .input(z.object({ workspaceId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmImportJob.findMany({
                where: { workspaceId: input.workspaceId },
                orderBy: { createdAt: "desc" },
                take: 20,
            });
        }),
});

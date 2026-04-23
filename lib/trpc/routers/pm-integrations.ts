import { z } from "zod";
import { router, publicProcedure } from "../init";
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
    connect: publicProcedure
        .input(z.object({
            workspaceId: z.string().optional(),
            userId: z.string().optional(),
            type: z.enum(["calendar", "git", "pm", "design"]),
            provider: z.string(),
            accessToken: z.string(),
            refreshToken: z.string().optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        }))
        .mutation(async ({ input }) => {
            return await connectIntegration(input as Parameters<typeof connectIntegration>[0]);
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

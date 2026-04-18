import { z } from "zod";
import { router, publicProcedure } from "../init";
import { 
    connectIntegration, 
    disconnectIntegration, 
    getUserIntegrations, 
    getWorkspaceIntegrations 
} from "@/lib/integrations/service";
import { importFromJira } from "@/lib/integrations/pm/jira-import";

export const pmIntegrationRouter = router({
    connect: publicProcedure
        .input(z.object({
            workspaceId: z.string().optional(),
            userId: z.string().optional(),
            type: z.enum(["calendar", "git", "pm", "design"]),
            provider: z.string(),
            accessToken: z.string(),
            refreshToken: z.string().optional(),
            metadata: z.record(z.string(), z.any()).optional()
        }))
        .mutation(async ({ input }) => {
            return await connectIntegration(input);
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

    triggerJiraImport: publicProcedure
        .input(z.object({
            integrationId: z.string(),
            projectId: z.string(),
            workspaceId: z.string(),
            defaultAssigneeId: z.string().optional()
        }))
        .mutation(async ({ input }) => {
            return await importFromJira(input.integrationId, {
                projectId: input.projectId,
                workspaceId: input.workspaceId,
                defaultAssigneeId: input.defaultAssigneeId
            });
        })
});

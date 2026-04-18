import { z } from "zod";
import { router, publicProcedure } from "../init";
import {
    detectRisks,
    forecastDelivery,
    analyzeRequirements,
    generateInsights,
} from "@/lib/ai/project-intelligence";

export const pmIntelligenceRouter = router({
    /**
     * Detect execution risks across a project.
     */
    detectRisks: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return detectRisks(input.projectId);
        }),

    /**
     * Forecast delivery for an active sprint.
     */
    forecastDelivery: publicProcedure
        .input(z.object({ sprintId: z.string() }))
        .query(async ({ input }) => {
            return forecastDelivery(input.sprintId);
        }),

    /**
     * Analyze requirement quality for a single issue.
     */
    analyzeRequirements: publicProcedure
        .input(z.object({ issueId: z.string() }))
        .query(async ({ input }) => {
            return analyzeRequirements(input.issueId);
        }),

    /**
     * Generate high-level manager insights for a project.
     */
    generateInsights: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return generateInsights(input.projectId);
        }),
});

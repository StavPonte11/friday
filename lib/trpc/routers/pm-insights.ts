import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { generateWorkInsights } from "@/lib/ai/insights-engine";
import { getCycleTime, getTopBottlenecks, getTeamLoad, getSprintVelocity } from "@/lib/analytics/work-metrics";

export const pmInsightsRouter = router({
    getInsights: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            const insights = await generateWorkInsights(input.projectId);
            return { insights };
        }),

    getMetrics: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            const [cycleTime, bottlenecks, teamLoad, velocity] = await Promise.all([
                getCycleTime(input.projectId),
                getTopBottlenecks(input.projectId, 5),
                getTeamLoad(input.projectId),
                getSprintVelocity(input.projectId, 6)
            ]);

            return { cycleTime, bottlenecks, teamLoad, velocity };
        })
});

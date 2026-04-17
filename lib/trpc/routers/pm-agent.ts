import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { executePmAgent } from "@/lib/ai/agent-executor";
import { trackEvent } from "../../analytics";

export const pmAgentRouter = router({
    runAgent: protectedProcedure
        .input(z.object({
            projectId: z.string(),
            input: z.string().min(1)
        }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;
            
            await trackEvent("pm_agent.run", { userId, projectId: input.projectId });
            
            return executePmAgent(input.input, input.projectId, userId);
        })
});

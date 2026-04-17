import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "../../analytics";

export const pmOnboardingRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    let onboarding = await prisma.userOnboarding.findUnique({ where: { userId } });
    
    if (!onboarding) {
        onboarding = await prisma.userOnboarding.create({ data: { userId, completedSteps: [] } });
    }
    return onboarding;
  }),
  
  completeStep: protectedProcedure
    .input(z.object({ step: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const current = await prisma.userOnboarding.findUnique({ where: { userId } });
      const steps = current?.completedSteps ?? [];
      
      if (!steps.includes(input.step)) {
          steps.push(input.step);
      }
      
      const updated = await prisma.userOnboarding.update({
          where: { userId },
          data: { completedSteps: steps }
      });
      await trackEvent("pm.onboarding.step", { userId, step: input.step });
      return updated;
    }),

  skip: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const updated = await prisma.userOnboarding.update({
          where: { userId },
          data: { skipped: true }
      });
      await trackEvent("pm.onboarding.skip", { userId });
      return updated;
  })
});

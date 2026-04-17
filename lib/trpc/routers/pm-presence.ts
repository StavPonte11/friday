import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "../../analytics";

export const pmPresenceRouter = router({
  setStatus: protectedProcedure
    .input(z.object({ status: z.enum(["online", "idle", "offline"]), currentView: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const presence = await prisma.userPresence.upsert({
        where: { userId },
        update: { status: input.status, currentView: input.currentView, lastSeenAt: new Date() },
        create: { userId, status: input.status, currentView: input.currentView },
      });
      
      await trackEvent("pm.presence.update", { 
          userId, 
          status: input.status, 
          view: input.currentView ?? "unknown" 
      });
      return presence;
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      // Return online/idle users matching the project view
      return prisma.userPresence.findMany({
        where: {
          currentView: { contains: input.projectId },
          status: { not: "offline" },
        },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
    }),
});

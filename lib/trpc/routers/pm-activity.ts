import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { checkPermission } from "../auth/rbac";

export const pmActivityRouter = router({
    list: protectedProcedure
        .input(z.object({
            projectId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const canView = await checkPermission(ctx.session.user.id, "board:view", { projectId: input.projectId });
            if (!canView) throw new TRPCError({ code: "FORBIDDEN" });

            return prisma.pmIssueActivity.findMany({
                where: {
                    issue: { projectId: input.projectId }
                },
                include: {
                    user: { select: { id: true, name: true, image: true, email: true } },
                    issue: { select: { id: true, title: true, status: true, key: true } }
                },
                orderBy: { createdAt: "desc" },
                take: 50
            });
        }),
});

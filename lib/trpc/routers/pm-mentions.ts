import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const pmMentionsRouter = router({
    searchUsers: protectedProcedure
        .input(z.object({ query: z.string().min(1) }))
        .query(async ({ input }) => {
            return prisma.user.findMany({
                where: {
                    name: { contains: input.query, mode: 'insensitive' }
                },
                take: 5,
                select: { id: true, name: true, image: true }
            });
        }),
});

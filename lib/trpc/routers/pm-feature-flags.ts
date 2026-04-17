import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";

export const pmFeatureFlagsRouter = router({
    get: publicProcedure
        .input(z.object({ key: z.string() }))
        .query(async ({ input }) => {
            const flag = await (prisma as any).featureFlag.findUnique({
                where: { key: input.key }
            });
            // Default to false if missing
            return flag?.isEnabled ?? false;
        }),
        
    getAll: publicProcedure
        .query(async () => {
            const flags = await (prisma as any).featureFlag.findMany();
            return flags.reduce((acc: any, flag: any) => {
                acc[flag.key] = flag.isEnabled;
                return acc;
            }, {});
        }),
});

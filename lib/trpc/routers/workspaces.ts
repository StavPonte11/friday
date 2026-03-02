import { router, publicProcedure } from "../init";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const workspacesRouter = router({
    list: publicProcedure.query(async () => {
        return prisma.workspace.findMany({
            orderBy: { createdAt: "asc" },
        });
    }),
});

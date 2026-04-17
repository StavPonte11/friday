import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

/**
 * GET /api/audit?workspaceId=xxx&limit=100
 * Returns audit log entries for the current workspace.
 * Requires an authenticated session.
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const workspaceId = searchParams.get("workspaceId") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 500);
    const entityType = searchParams.get("entityType") ?? undefined;

    const entries = await prisma.auditLog.findMany({
        where: {
            ...(workspaceId ? { workspaceId } : {}),
            ...(entityType ? { entityType } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            user: { select: { name: true, email: true, image: true } }
        }
    });

    return Response.json(entries);
}

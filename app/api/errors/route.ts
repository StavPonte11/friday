import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

interface ErrorPayload {
    message: string;
    stack?: string;
    componentStack?: string;
    url?: string;
    timestamp?: string;
}

/**
 * POST /api/errors
 * Receives frontend error reports and logs them to the AuditLog table.
 */
export async function POST(req: NextRequest) {
    try {
        const body: ErrorPayload = await req.json();

        // Log as an AuditLog entry with a dedicated entityType
        await prisma.auditLog.create({
            data: {
                action: "frontend.error",
                entityType: "FrontendError",
                details: body as any,
            }
        });

        return Response.json({ recorded: true });
    } catch (err) {
        console.error("[/api/errors]", err);
        return Response.json({ recorded: false }, { status: 500 });
    }
}

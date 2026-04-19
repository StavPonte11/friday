import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        await prisma.auditLog.create({
            data: {
                action: "USER_FEEDBACK",
                entityType: "PlatformFeedback",
                details: body,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
    }
}

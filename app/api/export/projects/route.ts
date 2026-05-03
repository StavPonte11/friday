import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown): string {
    const str = value === null || value === undefined ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
    const head = headers.map(csvCell).join(",");
    const body = rows.map(row => headers.map(h => csvCell(row[h])).join(",")).join("\n");
    return `${head}\n${body}`;
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
        return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const projects = await prisma.pmProject.findMany({
        where: { workspaceId },
        select: {
            key: true,
            name: true,
            description: true,
            status: true,
            owner: { select: { name: true, email: true } },
            _count: { select: { issues: true } },
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { name: "asc" },
    });

    const headers = [
        "key", "name", "description", "status",
        "owner_name", "owner_email", "issue_count",
        "createdAt", "updatedAt",
    ];

    const rows = projects.map((p: any) => ({
        key: p.key,
        name: p.name,
        description: p.description ?? "",
        status: p.status,
        owner_name: p.owner?.name ?? "",
        owner_email: p.owner?.email ?? "",
        issue_count: p._count?.issues ?? 0,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
    }));

    return new Response(toCSV(rows, headers), {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="projects-${workspaceId}.csv"`,
        },
    });
}

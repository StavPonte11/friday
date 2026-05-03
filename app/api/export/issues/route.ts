import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

/** CSV escape a single cell value */
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

    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) {
        return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const issues = await prisma.pmIssue.findMany({
        where: { projectId },
        select: {
            key: true,
            title: true,
            status: true,
            priority: true,
            type: true,
            assignee: { select: { name: true, email: true } },
            labels: { select: { name: true } },
            dueDate: true,
            originalEstimate: true,
            timeSpent: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { key: "asc" },
    });

    const headers = [
        "key", "title", "status", "priority", "type",
        "assignee_name", "assignee_email", "labels",
        "dueDate", "originalEstimate_min", "timeSpent_min",
        "createdAt", "updatedAt",
    ];

    const rows = issues.map(i => ({
        key: i.key,
        title: i.title,
        status: i.status,
        priority: i.priority,
        type: i.type,
        assignee_name: i.assignee?.name ?? "",
        assignee_email: i.assignee?.email ?? "",
        labels: i.labels.map(l => l.name).join(";"),
        dueDate: i.dueDate?.toISOString() ?? "",
        originalEstimate_min: i.originalEstimate ?? "",
        timeSpent_min: i.timeSpent ?? "",
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
    }));

    return new Response(toCSV(rows, headers), {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="issues-${projectId}.csv"`,
        },
    });
}

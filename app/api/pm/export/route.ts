import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

/**
 * GET /api/pm/export?projectId=xxx&format=csv|json
 * Exports all issues for a project as CSV or JSON.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const projectId = searchParams.get("projectId");
    const format = searchParams.get("format") ?? "csv";

    if (!projectId) {
        return new Response("projectId is required", { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const issues = await prisma.pmIssue.findMany({
        where: { projectId, deletedAt: null } as any,
        include: {
            assignee: { select: { name: true, email: true } },
            sprint: { select: { name: true } },
            labels: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
    });

    if (format === "json") {
        return new Response(JSON.stringify(issues, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="issues-${projectId}.json"`,
            }
        });
    }

    // CSV format
    const headers = [
        "Key", "Title", "Status", "Priority", "Type", "Assignee", "Sprint",
        "Story Points", "Due Date", "Labels", "Created At", "Updated At"
    ];

    const rows = issues.map(issue => [
        issue.key,
        `"${(issue.title ?? "").replace(/"/g, '""')}"`,
        issue.status,
        issue.priority,
        issue.type,
        (issue as any).assignee?.name ?? "",
        (issue as any).sprint?.name ?? "",
        issue.storyPoints ?? "",
        (issue as any).dueDate ? new Date((issue as any).dueDate).toISOString().split("T")[0] : "",
        ((issue as any).labels || []).map((l: any) => l.name).join(";"),
        new Date(issue.createdAt).toISOString(),
        new Date(issue.updatedAt).toISOString(),
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="issues-${projectId}.csv"`,
        }
    });
}

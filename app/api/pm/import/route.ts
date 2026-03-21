import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";

/**
 * POST /api/pm/import
 * Accepts multipart form data with a CSV file and bulk-imports issues.
 *
 * CSV must have columns: Title, Status, Priority, Type, Description
 * All other columns are optional.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const formData = await req.formData();
        const projectId = formData.get("projectId") as string;
        const file = formData.get("file") as File;

        if (!projectId || !file) {
            return new Response("projectId and file are required", { status: 400 });
        }

        const project = await prisma.pmProject.findUnique({ where: { id: projectId } });
        if (!project) {
            return new Response("Project not found", { status: 404 });
        }

        const text = await file.text();
        const lines = text.split("\n").filter(l => l.trim());
        if (lines.length < 2) {
            return new Response("CSV must have at least a header row and one data row", { status: 400 });
        }

        const headerLine = lines[0].split(",").map(h => h.trim().toLowerCase());
        const getCol = (row: string[], name: string): string => {
            const idx = headerLine.indexOf(name.toLowerCase());
            return idx >= 0 ? (row[idx] ?? "").replace(/^"|"$/g, "").trim() : "";
        };

        // Get current max issue number for this project
        const lastIssue = await prisma.pmIssue.findFirst({
            where: { projectId },
            orderBy: { createdAt: "desc" },
            select: { key: true }
        });

        let counter = lastIssue
            ? parseInt(lastIssue.key.split("-")[1] ?? "0", 10) + 1
            : 1;

        const results: { key: string; title: string }[] = [];
        const userId = (session.user as any).id;

        for (const line of lines.slice(1)) {
            const row = line.split(",");
            const title = getCol(row, "title");
            if (!title) continue;

            const key = `${project.key}-${counter++}`;
            const status = getCol(row, "status") || "TODO";
            const priority = (getCol(row, "priority") || "NONE").toUpperCase();
            const type = (getCol(row, "type") || "TASK").toUpperCase();
            const description = getCol(row, "description");

            try {
                const issue = await prisma.pmIssue.create({
                    data: {
                        key,
                        title,
                        status,
                        priority: priority as any,
                        type: type as any,
                        description: description || null,
                        projectId,
                        creatorId: userId,
                        workspaceId: project.workspaceId,
                    } as any
                });
                results.push({ key: issue.key, title: issue.title });
            } catch (err) {
                console.error(`[import] Failed to create issue ${key}:`, err);
            }
        }

        return Response.json({
            imported: results.length,
            issues: results,
        });
    } catch (err: any) {
        console.error("[import] Error:", err?.message ?? err);
        return new Response(`Import failed: ${err?.message ?? "unknown error"}`, { status: 500 });
    }
}

/**
 * Executive Dashboard Share Route
 * GET /api/pm/dashboard/share/[token]
 * 
 * Returns workspace metrics for a validated share token.
 * This is a public route — no auth required, only the token matters.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    if (!token) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

    const record = await prisma.pmShareToken.findUnique({ where: { token } });
    if (!record) return NextResponse.json({ error: "Token not found" }, { status: 404 });
    if (record.expiresAt && record.expiresAt < new Date()) {
        return NextResponse.json({ error: "Token expired" }, { status: 410 });
    }

    // Increment view count
    await prisma.pmShareToken.update({ where: { id: record.id }, data: { viewCount: { increment: 1 } } });

    const [projects, issuesByStatus, overdue, blockers] = await Promise.all([
        prisma.pmProject.findMany({
            where: {
                workspaceId: record.workspaceId,
                ...(record.projectId ? { id: record.projectId } : {}),
                deletedAt: null,
            },
            include: {
                sprints: {
                    where: { status: "ACTIVE" },
                    take: 1,
                    include: { issues: { select: { status: true, storyPoints: true } } }
                },
                _count: { select: { issues: true } }
            }
        }),
        prisma.pmIssue.groupBy({
            by: ["status"],
            where: {
                workspaceId: record.workspaceId,
                ...(record.projectId ? { projectId: record.projectId } : {}),
                deletedAt: null,
            },
            _count: { _all: true },
        }),
        prisma.pmIssue.count({
            where: {
                workspaceId: record.workspaceId,
                ...(record.projectId ? { projectId: record.projectId } : {}),
                deletedAt: null,
                dueDate: { lt: new Date() },
                status: { not: "DONE" },
            }
        }),
        prisma.pmIssue.count({
            where: {
                workspaceId: record.workspaceId,
                ...(record.projectId ? { projectId: record.projectId } : {}),
                deletedAt: null,
                status: "BLOCKED",
            }
        }),
    ]);

    const sprintHealth = projects.map(p => {
        const sprint = p.sprints[0];
        if (!sprint) return { id: p.id, name: p.name, sprintName: null, pct: null };
        const total = sprint.issues.length;
        const done = sprint.issues.filter(i => i.status === "DONE").length;
        return { id: p.id, name: p.name, sprintName: sprint.name, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    });

    return NextResponse.json({
        projects: projects.map(p => ({ id: p.id, name: p.name, key: p.key, issueCount: p._count.issues })),
        issuesByStatus,
        overdue,
        blockers,
        sprintHealth,
        generatedAt: new Date().toISOString(),
        viewCount: record.viewCount + 1,
    }, {
        headers: {
            "Cache-Control": "private, max-age=60",
            "X-FRIDAY-Shared": "true",
        }
    });
}

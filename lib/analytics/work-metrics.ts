import { prisma } from "@/lib/prisma";

/**
 * Calculates the average cycle time (days issue spent in 'IN_PROGRESS' or 'IN_REVIEW' before 'DONE')
 */
export async function getCycleTime(projectId: string): Promise<number | null> {
    const closedIssues = await prisma.pmIssue.findMany({
        where: { projectId, status: "DONE" },
        include: { statusHistory: { orderBy: { createdAt: 'asc' } } }
    });

    if (closedIssues.length === 0) return null;

    let totalDays = 0;
    
    for (const issue of closedIssues) {
        const inProgressState = issue.statusHistory.find(h => h.status === "IN_PROGRESS");
        const doneState = issue.statusHistory.find(h => h.status === "DONE");
        
        if (inProgressState && doneState) {
            const ms = doneState.createdAt.getTime() - inProgressState.createdAt.getTime();
            totalDays += ms / (1000 * 60 * 60 * 24);
        }
    }

    return totalDays / closedIssues.length;
}

/**
 * Identify bottlenecks (issues that multiple other issues DEPEND_ON or are BLOCKED_BY)
 */
export async function getTopBottlenecks(projectId: string, limit = 5) {
    const blockers = await prisma.issueRelation.groupBy({
        by: ['fromIssueId'],
        where: {
            type: 'BLOCKS',
            toIssue: { projectId }
        },
        _count: { toIssueId: true },
        orderBy: { _count: { toIssueId: 'desc' } },
        take: limit
    });

    const issueIds = blockers.map(b => b.fromIssueId);
    
    if (issueIds.length === 0) return [];

    const issues = await prisma.pmIssue.findMany({
        where: { id: { in: issueIds } },
        select: { id: true, key: true, title: true, status: true }
    });

    return blockers.map(b => ({
        issue: issues.find(i => i.id === b.fromIssueId)!,
        blockedCount: b._count.toIssueId
    }));
}

/**
 * Computes workload per assignee (currently active assigned points)
 */
export async function getTeamLoad(projectId: string) {
    const issues = await prisma.pmIssue.findMany({
        where: { 
            projectId, 
            status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW"] },
            assigneeId: { not: null }
        },
        include: { assignee: { select: { id: true, name: true, image: true } } }
    });

    const loadByUser = new Map<string, { user: any, count: number, points: number }>();

    for (const issue of issues) {
        if (!issue.assigneeId) continue;

        if (!loadByUser.has(issue.assigneeId)) {
            loadByUser.set(issue.assigneeId, { user: issue.assignee, count: 0, points: 0 });
        }
        
        const entry = loadByUser.get(issue.assigneeId)!;
        entry.count++;
        entry.points += issue.storyPoints || 0;
    }

    return Array.from(loadByUser.values()).sort((a, b) => b.points - a.points);
}

/**
 * Computes the number of completed points per sprint to determine velocity
 */
export async function getSprintVelocity(projectId: string, pastSprints = 5) {
    const sprints = await prisma.pmSprint.findMany({
        where: { projectId, status: "COMPLETED" },
        include: { issues: { where: { status: "DONE" } } },
        orderBy: { endDate: 'desc' },
        take: pastSprints
    });

    return sprints.reverse().map(sprint => {
        const completedPoints = sprint.issues.reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);
        return {
            sprintId: sprint.id,
            sprintName: sprint.name,
            completedPoints
        };
    });
}

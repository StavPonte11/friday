import { prisma } from "@/lib/prisma";
import { decryptAccessToken } from "../crypto";

interface ImportMapping {
    projectId: string;
    workspaceId: string;
    defaultAssigneeId?: string;
}

export async function importFromJira(integrationId: string, mapping: ImportMapping) {
    const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
    });

    if (!integration || integration.provider !== "jira") {
        throw new Error("Invalid Jira integration");
    }

    const token = decryptAccessToken(integration.accessToken);

    // MVP Flow
    // 1. Fetch from Jira API
    // GET /rest/api/3/search?jql=project=${mapping.projectId}
    const fakeJiraIssues = [
        { key: "JIRA-1", fields: { summary: "Setup server", description: "...", status: { name: "Done" } } },
        { key: "JIRA-2", fields: { summary: "Frontend UI", description: "...", status: { name: "In Progress" } } }
    ];

    // 2. Map and Insert
    const newIssues = await prisma.$transaction(fakeJiraIssues.map((jIssue, idx) => {
        return prisma.pmIssue.create({
            data: {
                key: `IMP-${idx}`, // Map safely in real scenario
                title: jIssue.fields.summary,
                description: jIssue.fields.description,
                status: jIssue.fields.status.name === "Done" ? "DONE" : "IN_PROGRESS",
                projectId: mapping.projectId,
                workspaceId: mapping.workspaceId,
                creatorId: mapping.defaultAssigneeId || "system", // Requires fallback user
                assigneeId: mapping.defaultAssigneeId,
            }
        });
    }));

    return {
        importedCount: newIssues.length,
        success: true
    };
}

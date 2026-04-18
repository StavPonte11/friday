import { prisma } from "@/lib/prisma";

export interface PullRequestPayload {
    provider: "github" | "gitlab";
    prId: string;
    prTitle: string;
    prUrl: string;
    state: "opened" | "merged" | "closed";
    workspaceId: string;
}

export async function processPullRequestEvent(payload: PullRequestPayload) {
    // 1. Auto-Linking: Extract Issue Key like FRIDAY-123
    const ISSUE_REGEX = /[A-Z]+-\d+/g;
    const matches = payload.prTitle.match(ISSUE_REGEX);

    if (!matches) return;

    for (const key of matches) {
        const issue = await prisma.pmIssue.findUnique({
            where: { key }
        });

        if (issue) {
            // Check if already linked
            // In a full implementation, you'd have a specific generic link table or store it in `customFields`/`metadata`
            const issueMeta = (issue.customFields as any) || {};
            const prLinks = issueMeta.prLinks || [];
            
            const existingPr = prLinks.find((pr: any) => pr.url === payload.prUrl);
            
            if (!existingPr) {
                prLinks.push({
                    url: payload.prUrl,
                    title: payload.prTitle,
                    state: payload.state,
                    provider: payload.provider
                });
            } else {
                existingPr.state = payload.state;
                existingPr.title = payload.prTitle;
            }

            let newStatus = issue.status;
            if (payload.state === "opened") newStatus = "IN_PROGRESS";
            if (payload.state === "merged") newStatus = "DONE";

            await prisma.pmIssue.update({
                where: { id: issue.id },
                data: {
                    status: newStatus as any,
                    customFields: { ...issueMeta, prLinks }
                }
            });
        }
    }
}

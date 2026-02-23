import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { env } from "@/lib/env";
import { parsePromptName, detectConflict, executeMerge } from "@/lib/prompt-merge";
import { postGitLabMRComment } from "@/lib/gitlab";

export async function POST(req: NextRequest) {
    try {
        const signature = req.headers.get("x-gitlab-token");
        if (!signature || signature !== env.GITLAB_WEBHOOK_SECRET) {
            return NextResponse.json({ error: "Unauthorized", data: null }, { status: 401 });
        }

        const payload = await req.json();

        // Filter: event = "merge_request", state = "merged", target_branch = "main"
        if (
            payload.object_kind !== "merge_request" ||
            payload.object_attributes?.state !== "merged" ||
            payload.object_attributes?.target_branch !== "main"
        ) {
            return NextResponse.json({ data: "Event ignored", error: null });
        }

        const sourceBranch = payload.object_attributes.source_branch;

        // In a real scenario, we might query Langfuse for prompts starting with `*/sourceBranch--*`
        // For this example, let's assume we know the prompt name convention maps exactly to the branch
        // Example: Feature branch 'feat/login-flow' implies prompt 'feat/login-flow--system-prompt'
        // Here we'd iterate over feature prompts. We'll simulate picking one up.

        // Simulated dummy feature prompt derived from branch name to show flow:
        const featurePromptName = `${sourceBranch}--system-prompt`;
        const productionPromptName = parsePromptName(featurePromptName);

        if (!productionPromptName) {
            return NextResponse.json({ data: "No prompt naming convention matched", error: null });
        }

        const hasConflict = await detectConflict(featurePromptName, productionPromptName);

        if (hasConflict) {
            await postGitLabMRComment(
                payload.project.id,
                payload.object_attributes.iid,
                `⚠️ **Prompt Merge Conflict Detected**: The production prompt \`${productionPromptName}\` was updated more recently. Please resolve manually.`
            );
            return NextResponse.json({ data: "Conflict detected", error: null });
        }

        const mergeResult = await executeMerge(featurePromptName, productionPromptName);

        await postGitLabMRComment(
            payload.project.id,
            payload.object_attributes.iid,
            `✅ **Prompt Merged**: Successfully promoted \`${featurePromptName}\` to \`${productionPromptName}\` (Production).`
        );

        return NextResponse.json({ data: "Success", error: null });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, data: null }, { status: 500 });
    }
}

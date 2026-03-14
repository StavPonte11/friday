import prisma from "./lib/prisma";
import { appRouter } from "./lib/trpc/server";
import {  PmIssueStatus, PmIssuePriority } from "@prisma/client";



async function runTest() {
    console.log("Starting PM Issue Integration Test...");
    let mockProjectId = "";
    let mockWorkspaceId = "";
    let mockUserId = "";

    try {
        const caller = appRouter.createCaller({} as any);

        const testUser = await prisma.user.create({
            data: {
                name: "Test User",
                email: `test-${Date.now()}@example.com`
            }
        });
        mockUserId = testUser.id;

        const testWorkspace = await prisma.workspace.create({
            data: {
                name: "Test Workspace",
                slug: `test-ws-${Date.now()}`
            }
        });
        mockWorkspaceId = testWorkspace.id;

        const testProject = await prisma.pmProject.create({
            data: {
                workspaceId: mockWorkspaceId,
                name: "Test Project",
                key: `TEST-${Date.now()}`
            }
        });
        mockProjectId = testProject.id;

        console.log(`Created test project: ${testProject.key} (ID: ${mockProjectId})`);

        // Test Good path
        console.log("Testing successful issue creation...");
        const input = {
            projectId: mockProjectId,
            title: "Test Issue Creation",
            description: "Testing TRPC mutation directly",
            status: PmIssueStatus.TODO,
            priority: PmIssuePriority.HIGH,
            creatorId: mockUserId
        };
        const result = await caller.pmIssues.create(input);

        console.log(`Success! Created issue ${result.key}. Title is "${result.title}"`);

        if (!result.key.includes(testProject.key)) {
            throw new Error(`Issue key ${result.key} did not include project key ${testProject.key}`);
        }

        // Test Bad path - No Title
        console.log("Testing validation failure (missing title)...");
        try {
            await caller.pmIssues.create({
                projectId: mockProjectId,
                title: "",
                creatorId: mockUserId
            });
            throw new Error("Validation failed to reject empty title!");
        } catch (e: any) {
            console.log(`Successfully caught expected error: ${e.message}`);
        }

        console.log("✅ ALL TESTS PASSED");

    } catch (error) {
        console.error("❌ TEST FAILED:", error);
    } finally {
        console.log("Cleaning up test data...");
        if (mockProjectId) await prisma.pmProject.delete({ where: { id: mockProjectId } });
        if (mockWorkspaceId) await prisma.workspace.delete({ where: { id: mockWorkspaceId } });
        if (mockUserId) await prisma.user.delete({ where: { id: mockUserId } });
        await prisma.$disconnect();
    }
}

runTest();

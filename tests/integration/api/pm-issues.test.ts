import { prisma } from "../../../lib/prisma";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { appRouter } from "../../../lib/trpc/server";
import {   PmIssuePriority } from "@prisma/client";



describe("PM Issues Router Integration", () => {
    let caller: ReturnType<typeof appRouter.createCaller>;
    let mockProjectId: string;
    let mockWorkspaceId: string;

    beforeAll(async () => {
        // Provide empty object or mocked context if required by TRPC router
        caller = appRouter.createCaller({} as any);

        // Setup test data
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
    });

    afterAll(async () => {
        // Cleanup test data
        await prisma.pmProject.delete({ where: { id: mockProjectId } });
        await prisma.workspace.delete({ where: { id: mockWorkspaceId } });
        await prisma.$disconnect();
    });

    describe("create", () => {
        it("should create a new issue with a generated key", async () => {
            const input = {
                projectId: mockProjectId,
                title: "Test Issue Creation",
                description: "Testing TRPC mutation",
                status: "TODO",
                priority: PmIssuePriority.HIGH,
                creatorId: "mock-test-creator"
            };

            const result = await caller.pmIssues.create(input);

            expect(result).toBeDefined();
            expect(result.title).toBe(input.title);
            expect(result.status).toBe("TODO");
            expect(result.priority).toBe(PmIssuePriority.HIGH);
            expect(result.key).toMatch(/TEST-\d+-\d+/);
        });

        it("should fail validation if title is missing", async () => {
            const input = {
                projectId: mockProjectId,
                title: "", // Empty title should fail zod validation
                creatorId: "mock-test-creator"
            };

            await expect(caller.pmIssues.create(input)).rejects.toThrow();
        });

        it("should fail if project does not exist", async () => {
            const input = {
                projectId: "invalid-project-id",
                title: "Bad Project Test",
                creatorId: "mock-test-creator"
            };

            await expect(caller.pmIssues.create(input)).rejects.toThrow(/Project not found/);
        });
    });
});

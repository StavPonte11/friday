import prisma from "../lib/prisma";
/**
 * FRIDAY PM — Large Dataset Generator
 * Generates configurable volumes of test data for stress testing.
 *
 * Usage:
 *   npx tsx scripts/generate-test-data.ts --projects=5 --issues=500 --developers=30 --sprints=8
 */

import { config } from "dotenv";
config({ path: ".env" });

import {   PmIssuePriority } from "@prisma/client";



// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
function parseArgs(): { projects: number; issues: number; developers: number; sprints: number } {
    const args = process.argv.slice(2);
    function getArg(name: string, defaultVal: number): number {
        const found = args.find(a => a.startsWith(`--${name}=`));
        return found ? parseInt(found.split("=")[1], 10) : defaultVal;
    }
    return {
        projects: getArg("projects", 3),
        issues: getArg("issues", 200),
        developers: getArg("developers", 15),
        sprints: getArg("sprints", 4),
    };
}

// ---------------------------------------------------------------------------
// Generator helpers
// ---------------------------------------------------------------------------
const FIRST_NAMES = ["Alex", "Blake", "Casey", "Dana", "Eli", "Finley", "Gray", "Harper", "Indigo", "Jordan", "Kendall", "Lee", "Morgan", "Noel", "Oakley", "Parker", "Quinn", "Riley", "Sage", "Taylor", "Umber", "Val", "Winter", "Xen", "Yael", "Zara"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Lewis", "Walker", "Hall", "Young"];
const ROLES = ["Backend Engineer", "Frontend Engineer", "ML Engineer", "DevOps Engineer", "QA Engineer"];

const ISSUE_PREFIXES = [
    "Implement", "Fix", "Optimize", "Refactor", "Add", "Create", "Remove", "Upgrade",
    "Investigate", "Research", "Document", "Design", "Test", "Deploy", "Migrate",
];
const ISSUE_SUBJECTS = [
    "authentication flow", "database query performance", "WebSocket connection handling",
    "agent state management", "LLM cost tracking", "trace ingestion pipeline",
    "UI component rendering", "API rate limiting", "sprint planning algorithm",
    "issue dependency graph", "notification system", "audit logging",
    "token refresh logic", "cache invalidation", "error boundary components",
    "Prisma schema migrations", "tRPC type inference", "Langfuse SDK integration",
    "Next.js middleware", "Docker build optimization",
];

const PRIORITIES: PmIssuePriority[] = [
    PmIssuePriority.NONE,
    PmIssuePriority.LOW,
    PmIssuePriority.LOW,
    PmIssuePriority.MEDIUM,
    PmIssuePriority.MEDIUM,
    PmIssuePriority.MEDIUM,
    PmIssuePriority.HIGH,
    PmIssuePriority.HIGH,
    PmIssuePriority.URGENT,
];

const STATUSES: string[] = [
    "BACKLOG",
    "TODO",
    PmIssuePriority.NONE as unknown as  // placeholder fixed below
    "IN_PROGRESS",
    "IN_REVIEW",
    "DONE",
    "DONE",
    "DONE",
];

const ISSUE_STATUSES: string[] = [
    "BACKLOG",
    "TODO",
    "TODO",
    "IN_PROGRESS",
    "IN_REVIEW",
    "DONE",
    "DONE",
    "DONE",
    "CANCELED",
];

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
    const params = parseArgs();
    const startTime = Date.now();

    console.log("⚡ FRIDAY PM — Data Generator");
    console.log(`   Projects:   ${params.projects}`);
    console.log(`   Issues:     ${params.issues}`);
    console.log(`   Developers: ${params.developers}`);
    console.log(`   Sprints:    ${params.sprints} per project\n`);

    // 1. Workspace
    const workspace = await prisma.workspace.upsert({
        where: { slug: "stress-test" },
        update: {},
        create: { name: "Stress Test Workspace", slug: "stress-test" },
    });

    // 2. Generate developers
    const userIds: string[] = [];
    for (let i = 0; i < params.developers; i++) {
        const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
        const lastName = LAST_NAMES[i % LAST_NAMES.length];
        const email = `dev${i}@stress.friday.dev`;
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                name: `${firstName} ${lastName}`,
                email,
                image: `https://api.dicebear.com/9.x/personas/svg?seed=${i}`,
            },
        });
        await prisma.workspaceMember.upsert({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
            update: {},
            create: { workspaceId: workspace.id, userId: user.id, role: "MEMBER" },
        });
        userIds.push(user.id);
    }
    console.log(`✅ Users: ${params.developers} created`);

    // 3. Generate projects
    const issuesPerProject = Math.ceil(params.issues / params.projects);
    let totalCreated = 0;

    for (let p = 0; p < params.projects; p++) {
        const projectKey = `ST${p + 1}`;
        const project = await prisma.pmProject.upsert({
            where: { key: projectKey },
            update: {},
            create: {
                workspaceId: workspace.id,
                key: projectKey,
                name: `Stress Test Project ${p + 1}`,
                description: `Auto-generated project ${p + 1} for stress testing.`,
            },
        });

        // Create sprints
        const sprintIds: string[] = [];
        for (let s = 0; s < params.sprints; s++) {
            const sprintId = `stress-sprint-${projectKey}-${s}`;
            const sprint = await prisma.pmSprint.upsert({
                where: { id: sprintId },
                update: {},
                create: {
                    id: sprintId,
                    projectId: project.id,
                    name: `Sprint ${s + 1}`,
                    startDate: daysAgo((params.sprints - s) * 14),
                    endDate: daysAgo((params.sprints - s - 1) * 14),
                    status: s < params.sprints - 1 ? "COMPLETED" : "ACTIVE",
                },
            });
            sprintIds.push(sprint.id);
        }

        // Generate issues
        for (let i = 0; i < issuesPerProject; i++) {
            const issueKey = `${projectKey}-${i + 1}`;
            const prefix = randomFrom(ISSUE_PREFIXES);
            const subject = randomFrom(ISSUE_SUBJECTS);
            const title = `${prefix} ${subject}`;
            const priority = randomFrom(PRIORITIES);
            const status = randomFrom(ISSUE_STATUSES);
            const creatorId = randomFrom(userIds);
            const assigneeId = status !== "BACKLOG" ? randomFrom(userIds) : null;
            const sprintId = status === "BACKLOG" ? null : randomFrom(sprintIds);

            await prisma.pmIssue.upsert({
                where: { key: issueKey },
                update: { status },
                create: {
                    key: issueKey,
                    projectId: project.id,
                    title,
                    description: `Auto-generated issue: ${title}. Requires investigation and implementation by the engineering team.`,
                    status,
                    priority,
                    storyPoints: randomInt(1, 13),
                    complexityScore: randomInt(1, 10),
                    predictedTime: `${randomInt(1, 7)} days`,
                    assigneeId,
                    creatorId,
                    sprintId,
                    createdAt: daysAgo(randomInt(1, 90)),
                    updatedAt: new Date(),
                },
            });
            totalCreated++;
        }

        console.log(`✅ Project ${projectKey}: ${issuesPerProject} issues, ${params.sprints} sprints`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`\n🎉 Generation complete in ${elapsed}ms`);
    console.log(`   Total issues created: ${totalCreated}`);
    console.log(`   Total projects:       ${params.projects}`);
    console.log(`   Total users:          ${params.developers}`);
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error("❌ Generator failed:", e);
        await prisma.$disconnect();
        process.exit(1);
    });

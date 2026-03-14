import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { addProjectCreatorAsAdmin, getAccessibleProjects } from "@/lib/pm/rbac";

export const pmProjectsRouter = router({
    /**
     * List projects accessible to the current user.
     * Workspace admins see all projects; others see only member projects.
     */
    list: publicProcedure
        .input(z.object({
            workspaceId: z.string().optional(),
            userId: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
            if (input?.userId) {
                return getAccessibleProjects(input.userId, input.workspaceId);
            }
            // Fallback for unauthenticated dev usage – returns all
            const whereClause = input?.workspaceId ? { workspaceId: input.workspaceId } : undefined;
            return prisma.pmProject.findMany({
                where: whereClause,
                include: { _count: { select: { issues: true, sprints: true } } },
                orderBy: { updatedAt: "desc" }
            });
        }),

    create: publicProcedure
        .input(z.object({
            workspaceId: z.string(),
            name: z.string().min(1),
            key: z.string().min(2).max(10).toUpperCase(),
            description: z.string().optional(),
            creatorId: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            const { creatorId, ...projectData } = input;

            // Validate unique key
            const existing = await prisma.pmProject.findUnique({ where: { key: input.key } });
            if (existing) throw new Error(`Project key ${input.key} already exists`);

            const project = await prisma.pmProject.create({ data: projectData });

            // Auto-add creator as PROJECT_ADMIN
            if (creatorId) {
                await addProjectCreatorAsAdmin(creatorId, project.id);
            }

            return project;
        }),

    get: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmProject.findUnique({
                where: { id: input.id },
                include: {
                    sprints: { orderBy: { createdAt: "desc" } },
                    members: {
                        include: { user: { select: { id: true, name: true, email: true, image: true } } }
                    },
                    versions: { orderBy: { releaseDate: "asc" } },
                }
            });
        }),

    updateWorkflow: publicProcedure
        .input(z.object({
            id: z.string(),
            workflow: z.any()
        }))
        .mutation(async ({ input }) => {
            return prisma.pmProject.update({
                where: { id: input.id },
                data: { workflow: input.workflow }
            });
        }),

    addMember: publicProcedure
        .input(z.object({
            projectId: z.string(),
            userId: z.string(),
            role: z.enum(["PROJECT_ADMIN", "TEAM_LEADER", "DEVELOPER", "VIEWER"]).default("DEVELOPER"),
        }))
        .mutation(async ({ input }) => {
            return prisma.pmProjectMember.upsert({
                where: {
                    projectId_userId: { projectId: input.projectId, userId: input.userId }
                },
                create: {
                    projectId: input.projectId,
                    userId: input.userId,
                    role: input.role as any,
                },
                update: { role: input.role as any }
            });
        }),

    removeMember: publicProcedure
        .input(z.object({
            projectId: z.string(),
            userId: z.string(),
        }))
        .mutation(async ({ input }) => {
            await prisma.pmProjectMember.delete({
                where: { projectId_userId: { projectId: input.projectId, userId: input.userId } }
            });
            return { success: true };
        }),

    listMembers: publicProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmProjectMember.findMany({
                where: { projectId: input.projectId },
                include: {
                    user: { select: { id: true, name: true, email: true, image: true } }
                }
            });
        }),
});

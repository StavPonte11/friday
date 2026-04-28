import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import { addProjectCreatorAsAdmin, getAccessibleProjects } from "@/lib/pm/rbac";

export const pmProjectsRouter = router({
    /**
     * List projects accessible to the current user.
     * Workspace admins see all projects; others see only member projects.
     */
    list: protectedProcedure
        .input(z.object({
            workspaceId: z.string().optional(),
        }).optional())
        .query(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            // Always strictly scope to what the user has access to
            return getAccessibleProjects(userId, input?.workspaceId);
        }),

    create: protectedProcedure
        .input(z.object({
            workspaceId: z.string(),
            name: z.string().min(1),
            key: z.string().min(2).max(10).toUpperCase(),
            description: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const creatorId = ctx.session.user.id;

            // Validate unique key WITHIN the workspace only (not globally)
            const existing = await prisma.pmProject.findFirst({
                where: { key: input.key, workspaceId: input.workspaceId, deletedAt: null }
            });
            if (existing) throw new Error(`Project key "${input.key}" already exists in this workspace`);

            const project = await prisma.pmProject.create({ data: input });

            // Auto-add creator as PROJECT_ADMIN
            await addProjectCreatorAsAdmin(creatorId, project.id);

            return project;
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            description: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            const { id, ...data } = input;
            // Only PROJECT_ADMIN can update
            const member = await prisma.pmProjectMember.findUnique({
                where: { projectId_userId: { projectId: id, userId } }
            });
            if (!member || member.role !== "PROJECT_ADMIN") {
                throw new Error("Only project admins can update this project");
            }
            return prisma.pmProject.update({ where: { id }, data });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.session.user.id;
            const member = await prisma.pmProjectMember.findUnique({
                where: { projectId_userId: { projectId: input.id, userId } }
            });
            if (!member || member.role !== "PROJECT_ADMIN") {
                throw new Error("Only project admins can delete this project");
            }
            await prisma.pmProject.update({
                where: { id: input.id },
                data: { deletedAt: new Date() }
            });
            return { success: true };
        }),

    get: publicProcedure
        .input(z.object({ id: z.string(), userId: z.string().optional() }))
        .query(async ({ input }) => {
            const project = await prisma.pmProject.findUnique({
                where: { id: input.id, deletedAt: null } as any,
                include: {
                    sprints: { orderBy: { createdAt: "desc" } },
                    members: {
                        include: { user: { select: { id: true, name: true, email: true, image: true } } }
                    },
                    versions: { orderBy: { releaseDate: "asc" } },
                }
            });

            if (project && input.userId) {
                await (prisma as any).pmRecentView.upsert({
                    where: {
                        userId_entityType_entityId: {
                            userId: input.userId,
                            entityType: "project",
                            entityId: input.id
                        }
                    },
                    create: {
                        userId: input.userId,
                        entityType: "project",
                        entityId: input.id
                    },
                    update: {
                        viewedAt: new Date()
                    }
                }).catch(() => {});
            }

            return project;
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

    delete: publicProcedure
        .input(z.object({ id: z.string(), actorId: z.string().optional() }))
        .mutation(async ({ input }) => {
            await prisma.pmProject.update({
                where: { id: input.id },
                data: { deletedAt: new Date(), deletedById: input.actorId } as any
            });
            return { success: true };
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

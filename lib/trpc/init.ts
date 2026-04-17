import { initTRPC, TRPCError } from "@trpc/server";
import { getServerSession, type Session } from "next-auth";
import superjson from "superjson";
import { type WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface TRPCContext {
  session: Session | null;
}

export async function createTRPCContext(): Promise<TRPCContext> {
  const session = await getServerSession();
  return { session };
}

// ---------------------------------------------------------------------------
// tRPC instance
// ---------------------------------------------------------------------------

export const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;

// ---------------------------------------------------------------------------
// Public procedure — no auth required
// ---------------------------------------------------------------------------

export const publicProcedure = t.procedure;

// ---------------------------------------------------------------------------
// Protected procedure — requires authenticated session
// In development with BYPASS_AUTH=true, injects a mock session so local
// dev works without a running auth provider.
// ---------------------------------------------------------------------------

const MOCK_SESSION: Session = {
  user: {
    id: "dev-user-1",
    name: "Dev User",
    email: "dev@friday.local",
    image: null,
  },
  expires: new Date(Date.now() + 86_400_000).toISOString(),
};

const isAuthed = t.middleware(async ({ ctx, next }) => {
  // Dev bypass: allows local development without a real auth session
  if (
    process.env.BYPASS_AUTH === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return next({ ctx: { session: MOCK_SESSION } });
  }

  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// ---------------------------------------------------------------------------
// Role-based procedure wrappers
// ---------------------------------------------------------------------------

export const requireRole = (allowedRoles: WorkspaceRole[]) => t.middleware(async ({ ctx, next, getRawInput }) => {
  if (
    process.env.BYPASS_AUTH === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return next({ ctx });
  }

  const userId = ctx.session?.user?.id;
  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Attempt to extract workspaceId from input
  const rawInput = await getRawInput();
  const input = rawInput as { workspaceId?: string } | undefined;
  const workspaceId = input?.workspaceId;

  if (!workspaceId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "workspaceId is required in the input for this scoped procedure." 
    });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } }
  });

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User does not have required clearance for this workspace."
    });
  }

  return next({ ctx });
});

export const workspaceProcedure = (allowedRoles: WorkspaceRole[]) => protectedProcedure.use(requireRole(allowedRoles));
export const adminProcedure = workspaceProcedure(['ADMIN', 'OWNER']);
export const memberProcedure = workspaceProcedure(['ADMIN', 'OWNER', 'MEMBER']);

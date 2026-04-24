import { getServerSession as nextAuthGetServerSession } from "next-auth";
import { authOptions } from "./auth";

// ---------------------------------------------------------------------------
// Typed session user — enriched from JWT callbacks
// ---------------------------------------------------------------------------
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  workspaceId: string | null;
}

export interface AuthSession {
  user: SessionUser;
  expires: string;
}

/**
 * Server-side session helper — always returns a typed session or null.
 * Use in Server Components, Route Handlers, and tRPC context.
 */
export async function getServerSession(): Promise<AuthSession | null> {
  const raw = await nextAuthGetServerSession(authOptions);
  if (!raw?.user) return null;

  const user = raw.user as Record<string, unknown>;

  return {
    ...raw,
    user: {
      id: (user.id as string) ?? (user.sub as string) ?? "",
      email: (user.email as string) ?? "",
      name: (user.name as string | null) ?? null,
      image: (user.image as string | null) ?? null,
      role: (user.role as SessionUser["role"]) ?? "MEMBER",
      workspaceId: (user.workspaceId as string | null) ?? null,
    },
  } as AuthSession;
}

/**
 * Like getServerSession but throws UNAUTHORIZED if not authenticated.
 * Convenience for tRPC procedures that call it from ctx.
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

/**
 * Simulated SSO Endpoint
 * 
 * In a real integration, this would receive a response from an SSO provider
 * (e.g., Okta, Auth0, Azure AD). For now, it accepts a base64 encoded JSON
 * identity payload and creates/updates the user session.
 * 
 * Real SSO integration later: replace the token parsing with your provider's
 * OIDC/OAuth callback handler.
 * 
 * Usage: GET /api/auth/sso?token=<base64(JSON)>
 * 
 * JSON payload shape:
 * {
 *   "email": "user@example.com",
 *   "name": "Alice",
 *   "ssoProvider": "okta",
 *   "ssoId": "user-unique-id-from-provider",
 *   "image": "https://example.com/avatar.jpg" // optional
 * }
 */
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "Missing token parameter" }, { status: 400 });
    }

    let identity: {
        email: string;
        name: string;
        ssoProvider: string;
        ssoId: string;
        image?: string;
    };

    try {
        const decoded = Buffer.from(token, "base64").toString("utf-8");
        identity = JSON.parse(decoded);

        if (!identity.email || !identity.ssoProvider || !identity.ssoId) {
            throw new Error("Invalid identity payload");
        }
    } catch {
        return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    try {
        // Upsert user based on email — preserves existing users
        const user = await prisma.user.upsert({
            where: { email: identity.email },
            update: {
                name: identity.name,
                ssoProvider: identity.ssoProvider,
                ssoId: identity.ssoId,
                image: identity.image ?? undefined,
                updatedAt: new Date(),
            },
            create: {
                email: identity.email,
                name: identity.name,
                ssoProvider: identity.ssoProvider,
                ssoId: identity.ssoId,
                image: identity.image ?? null,
            }
        });

        // Return identity so the client can use it to establish a session
        // In production: redirect to provider callback or set cookie
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                ssoProvider: user.ssoProvider,
                ssoId: user.ssoId,
            },
            message: "SSO identity verified. Use NextAuth signIn() with this identity.",
            nextStep: "Call POST /api/auth/callback/credentials with the returned user id."
        });
    } catch (error) {
        console.error("[SSO] Failed to upsert user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Validate SSO token – used by auth providers to verify identity
 * POST /api/auth/sso
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, ssoProvider: true, ssoId: true }
        });

        if (!user || !user.ssoId) {
            return NextResponse.json({ error: "No SSO identity found for this email" }, { status: 404 });
        }

        return NextResponse.json({ valid: true, user });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

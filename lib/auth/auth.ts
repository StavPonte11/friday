import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import type { NextAuthOptions } from "next-auth";
import type { SessionUser } from "./session";

export const authOptions: NextAuthOptions = {
    // No adapter – using JWT-only strategy.
    // @auth/prisma-adapter v2 is incompatible with next-auth v4.
    // Google users are upserted manually in the jwt callback below.
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            allowDangerousEmailAccountLinking: true
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                ssoToken: { label: "SSO Token", type: "text" }
            },
            async authorize(credentials) {
                // 1. SSO Token Flow
                if (credentials?.ssoToken) {
                    try {
                        const decoded = Buffer.from(credentials.ssoToken, "base64").toString("utf-8");
                        const identity = JSON.parse(decoded);
                        if (!identity.email || !identity.ssoProvider || !identity.ssoId) return null;

                        const user = await prisma.user.findUnique({
                            where: { email: identity.email }
                        });

                        if (user && user.ssoId === identity.ssoId) {
                            return user;
                        }
                        return null;
                    } catch {
                        return null;
                    }
                }

                // 2. Standard Password Flow
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user || !user.isActive) return null;

                // Support legacy hardcoded admin for local dev fallback until seeded
                if (user.email === "admin@friday.local" && credentials.password === "admin") {
                    return user;
                }

                if (!user.passwordHash) return null;

                const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
                return isValid ? user : null;
            }
        })
    ],
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user: authUser, account, profile }) {
            // initial sign in
            if (authUser) {
                token.id = authUser.id;
            }

            // Google OAuth: upsert user + store id on first sign-in
            if (account?.provider === "google" && profile?.email) {
                const googleEmail = profile.email as string;
                const googleName = (profile as any).name as string | undefined;
                const googleImage = (profile as any).picture as string | undefined;

                const user = await prisma.user.upsert({
                    where: { email: googleEmail },
                    update: { name: googleName, image: googleImage },
                    create: {
                        email: googleEmail,
                        name: googleName ?? googleEmail.split("@")[0],
                        image: googleImage ?? null,
                        ssoProvider: "google",
                        ssoId: (profile as any).sub as string,
                    },
                });
                token.id = user.id;
            }

            // Enrich with workspace role
            if (token.id && !token.role) {
                const membership = await prisma.workspaceMember.findFirst({
                    where: { userId: token.id as string },
                    orderBy: { createdAt: 'asc' },
                });
                token.role = membership?.role ?? "VIEWER";
                token.workspaceId = membership?.workspaceId ?? null;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const user = session.user as Record<string, unknown>;
                user.id = token.id;
                user.role = token.role;
                user.workspaceId = token.workspaceId;
            }
            return session;
        }
    },
    pages: {
        signIn: '/en/auth/login',
        error: '/en/auth/login',
    }
};

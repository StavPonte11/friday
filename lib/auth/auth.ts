import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import type { NextAuthOptions } from "next-auth";
import type { SessionUser } from "./session";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
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
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
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
        async jwt({ token, user: authUser }) {
            // initial sign in
            if (authUser) {
                token.id = authUser.id;
                
                // Fetch workspace role mapping for auth payload enrichment
                const membership = await prisma.workspaceMember.findFirst({
                    where: { userId: authUser.id },
                    orderBy: { createdAt: 'asc' } // prioritize oldest membership
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
    }
};

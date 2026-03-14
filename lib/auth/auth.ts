import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";


import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // Basic mock authorize for phase 1.
                // In reality we would hash check here against DB
                if (credentials?.email === "admin@friday.local" && credentials?.password === "admin") {
                    return { id: "1", name: "Admin", email: "admin@friday.local" };
                }
                return null;
            }
        })
    ],
    session: { strategy: "jwt" }
};

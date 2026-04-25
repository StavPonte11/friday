import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const { email, password, name } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "User already exists with that email" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data: {
                email,
                name: name || email.split("@")[0],
                passwordHash,
            }
        });

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
}

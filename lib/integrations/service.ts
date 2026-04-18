import { prisma } from "@/lib/prisma";
import { encryptAccessToken } from "./crypto";

interface ConnectParams {
    userId?: string;
    workspaceId?: string;
    type: string;
    provider: string;
    accessToken: string;
    refreshToken?: string;
    metadata?: Record<string, any>;
}

export async function connectIntegration(params: ConnectParams) {
    if (!params.userId && !params.workspaceId) {
        throw new Error("Must provide either userId or workspaceId");
    }

    const encryptedAccessToken = encryptAccessToken(params.accessToken);
    const encryptedRefreshToken = params.refreshToken ? encryptAccessToken(params.refreshToken) : undefined;

    return await prisma.integration.create({
        data: {
            userId: params.userId,
            workspaceId: params.workspaceId,
            type: params.type,
            provider: params.provider,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            metadata: params.metadata || {},
        },
    });
}

export async function disconnectIntegration(id: string) {
    return await prisma.integration.delete({
        where: { id },
    });
}

export async function getUserIntegrations(userId: string) {
    return await prisma.integration.findMany({
        where: { userId },
        select: {
            id: true,
            type: true,
            provider: true,
            metadata: true,
            createdAt: true,
            // never select the tokens directly
        },
    });
}

export async function getWorkspaceIntegrations(workspaceId: string) {
    return await prisma.integration.findMany({
        where: { workspaceId },
        select: {
            id: true,
            type: true,
            provider: true,
            metadata: true,
            createdAt: true,
            // never select the tokens directly
        },
    });
}

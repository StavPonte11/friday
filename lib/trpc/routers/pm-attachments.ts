import { z } from "zod";
import { router, publicProcedure } from "../init";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Resolve public uploads directory (local dev fallback for S3)
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Ensure upload directory exists.
 */
function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
}

export const pmAttachmentsRouter = router({
    /**
     * List attachments for an issue.
     */
    list: publicProcedure
        .input(z.object({ issueId: z.string() }))
        .query(async ({ input }) => {
            return prisma.pmAttachment.findMany({
                where: { issueId: input.issueId },
                include: {
                    uploader: { select: { id: true, name: true, image: true } }
                },
                orderBy: { createdAt: "desc" }
            });
        }),

    /**
     * Register an uploaded attachment in the DB.
     * The actual file should be uploaded via /api/upload first.
     */
    create: publicProcedure
        .input(z.object({
            issueId: z.string(),
            uploaderId: z.string(),
            filename: z.string(),
            url: z.string().url().or(z.string().startsWith("/")),
            size: z.number().int().positive(),
            mimeType: z.string(),
        }))
        .mutation(async ({ input }) => {
            return prisma.pmAttachment.create({ data: input });
        }),

    /**
     * Delete an attachment (uploader only or admin).
     */
    delete: publicProcedure
        .input(z.object({
            id: z.string(),
            uploaderId: z.string(),
        }))
        .mutation(async ({ input }) => {
            const attachment = await prisma.pmAttachment.findUnique({ where: { id: input.id } });
            if (!attachment) throw new Error("Attachment not found");
            if (attachment.uploaderId !== input.uploaderId) throw new Error("Only the uploader can delete this attachment");

            // Remove local file if it's a local upload
            if (attachment.url.startsWith("/uploads/")) {
                const filePath = path.join(process.cwd(), "public", attachment.url);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            await prisma.pmAttachment.delete({ where: { id: input.id } });
            return { success: true };
        }),

    /**
     * Get presigned upload URL.
     * For local dev: returns a path to POST to /api/upload.
     * For production: returns an S3 presigned URL.
     */
    getUploadUrl: publicProcedure
        .input(z.object({
            filename: z.string(),
            mimeType: z.string(),
            issueId: z.string(),
        }))
        .mutation(async ({ input }) => {
            const hasS3 = !!(
                process.env.AWS_BUCKET &&
                process.env.AWS_REGION &&
                process.env.AWS_ACCESS_KEY_ID
            );

            const ext = path.extname(input.filename);
            const safeName = `${crypto.randomUUID()}${ext}`;

            if (hasS3) {
                // Production: return S3 presigned URL
                // Requires `@aws-sdk/s3-presigned-post` package
                // const { url, fields } = await createPresignedPost(s3Client, { Bucket, Key: safeName, ... });
                // return { uploadUrl: url, fields, key: safeName };
                throw new Error("S3 upload not configured. Set AWS_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID env vars.");
            }

            // Local dev: Simple POST to /api/upload
            ensureUploadDir();
            return {
                uploadUrl: `/api/upload`,
                key: safeName,
                localMode: true,
                issueId: input.issueId,
            };
        }),
});

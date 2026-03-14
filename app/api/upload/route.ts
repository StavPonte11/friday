import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Local file upload handler.
 * In production, use S3 presigned URLs from pmAttachments.getUploadUrl instead.
 * 
 * POST /api/upload
 * Content-Type: multipart/form-data
 * Body fields: file (File), issueId (string), key (string, optional)
 */
export async function POST(req: NextRequest) {
    try {
        // Ensure directory exists
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const issueId = formData.get("issueId") as string | null;
        const key = formData.get("key") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file size (50MB max)
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 });
        }

        const ext = path.extname(file.name);
        const safeName = key ?? `${crypto.randomUUID()}${ext}`;
        const filePath = path.join(UPLOAD_DIR, safeName);

        // Write file
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        const url = `/uploads/${safeName}`;

        return NextResponse.json({
            success: true,
            url,
            filename: file.name,
            size: file.size,
            mimeType: file.type,
            key: safeName,
            issueId,
        });
    } catch (error) {
        console.error("[Upload API] Error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}

// Support GET for health check
export async function GET() {
    return NextResponse.json({ status: "Upload endpoint active. Use POST with multipart/form-data." });
}

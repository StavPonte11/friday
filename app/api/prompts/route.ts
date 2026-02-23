import { NextRequest, NextResponse } from "next/server";
import { fetchLangfuseAPI } from "@/lib/langfuse";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page") || "1";

        const res = await fetchLangfuseAPI(`/api/public/v2/prompts?page=${page}`);

        return NextResponse.json({ data: res.data, error: null, meta: res.meta });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, data: null }, { status: 500 });
    }
}

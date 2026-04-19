import { NextResponse } from "next/server";
import { generateManagerReport } from "@/lib/ai/manager-report";

export async function POST(req: Request) {
    try {
        const { projectId } = await req.json();
        
        if (!projectId) {
            return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
        }
        
        const reportObj = await generateManagerReport(projectId);
        
        return NextResponse.json({ report: reportObj.markdown });
    } catch (error: any) {
        if (error.message?.includes("404") || error.message?.includes("not found")) {
            return NextResponse.json({ error: "AI Model missing. Run ollama pull llama3" }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }
}

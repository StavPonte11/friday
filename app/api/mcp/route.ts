import { NextRequest, NextResponse } from "next/server";
import { mcpServer } from "@/packages/mcp-tools/server";

// MCP HTTP endpoint providing proxy to the MCP local server
// Clients can send standard JSON-RPC 2.0 requests to this endpoint
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // This simulates handling a JSON-RPC request by directly invoking the RequestHandler matching logic.
        // It's a lightweight bridge to enable standard POST access.
        if (body.method === "tools/list") {
            const result = await mcpServer.request({ method: "tools/list" } as any, mcpServer as any);
            return NextResponse.json(result);
        }
        
        if (body.method === "tools/call") {
            const result = await mcpServer.request({
                method: "tools/call", 
                params: body.params
            } as any, mcpServer as any);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Method not supported over basic HTTP bridge" }, { status: 400 });
        
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

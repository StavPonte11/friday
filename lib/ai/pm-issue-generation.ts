import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export const aiIssueSchema = z.object({
    title: z.string().describe("A concise, professional title for the issue"),
    description: z.string().describe("Detailed markdown description of the issue, expanding on the prompt"),
    subtasks: z.array(z.string()).describe("A list of concrete subtasks or implementation steps"),
    criteria: z.array(z.string()).describe("Acceptance criteria for this issue to be considered done"),
    complexity: z.number().min(1).max(10).describe("Estimated complexity from 1 to 10"),
    labels: z.array(z.string()).describe("Suggested labels or tags, max 3 (e.g. 'bug', 'feature')"),
});

export type GeneratedIssue = z.infer<typeof aiIssueSchema>;

import { getLLMProvider } from "@/lib/ai/provider";

export async function generateIssueFromPrompt(prompt: string): Promise<GeneratedIssue> {
    const llm = getLLMProvider().withStructuredOutput(aiIssueSchema, { name: "GeneratedIssue", method: "jsonMode" });
    try {
        const result = await llm.invoke([
            ["system", "You are an expert technical product manager. Your job is to take raw user ideas and convert them into well-structured, actionable engineering issues suitable for Jira or Linear. You MUST reply with valid JSON only matching the schema: { title: string, description: string, subtasks: string[], criteria: string[], complexity: number, labels: string[] }"],
            ["human", prompt]
        ]);

        return result as GeneratedIssue;
    } catch (error: any) {
        if (error.message?.includes("404") || error.message?.includes("not found")) {
            throw new Error("AI Model not found on local Ollama server. Please run 'ollama pull llama3' in your terminal, or configure LLM_API_KEY in .env.");
        }
        throw error;
    }
}

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

export async function generateIssueFromPrompt(prompt: string): Promise<GeneratedIssue> {
    const llm = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0.2,
    }).withStructuredOutput(aiIssueSchema, { name: "GeneratedIssue" });

    const result = await llm.invoke([
        ["system", "You are an expert technical product manager. Your job is to take raw user ideas and convert them into well-structured, actionable engineering issues suitable for Jira or Linear."],
        ["human", prompt]
    ]);

    return result as GeneratedIssue;
}

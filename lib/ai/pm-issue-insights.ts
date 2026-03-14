import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export const issueInsightsSchema = z.object({
    complexityScore: z.number().min(1).max(10).describe("Estimated complexity / story points from 1 to 10. 1 is trivial, 10 is an epic-level task."),
    predictedTime: z.string().describe("Estimated wall-clock time to completion, e.g., '2 days', '1 week'"),
    suggestedAssigneeSkills: z.array(z.string()).describe("A list of 1-3 key engineer skills needed for this (e.g., 'React', 'Prisma', 'DevOps')"),
});

export type IssueInsights = z.infer<typeof issueInsightsSchema>;

export async function generateIssueInsights(title: string, description: string | null): Promise<IssueInsights> {
    const llm = new ChatOpenAI({
        modelName: "gpt-4o-mini", // fast and cheap for reasoning
        temperature: 0.1,
    }).withStructuredOutput(issueInsightsSchema, { name: "IssueInsights" });

    const prompt = `Analyze the following engineering issue and provide complexity, time, and skill insights.

Title: ${title}
Description:
${description || "No description provided."}
`;

    const result = await llm.invoke([
        ["system", "You are an expert engineering manager. Your job is to analyze technical issues and provide strictly formatted operational insights."],
        ["human", prompt]
    ]);

    return result as IssueInsights;
}

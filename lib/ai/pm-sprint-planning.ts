import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export const sprintPlanSchema = z.object({
    recommendedIssueIds: z.array(z.string()).describe("List of issue IDs recommended for the sprint"),
    reasoning: z.string().describe("Explanation for why these issues were chosen, focusing on priority and capacity"),
    estimatedVelocity: z.number().describe("Total estimated complexity score of the recommended issues")
});

export type SprintPlan = z.infer<typeof sprintPlanSchema>;

export async function generateSprintPlan(
    backlog: { id: string; title: string; complexityScore: number | null; priority: string }[],
    targetVelocity: number
): Promise<SprintPlan> {
    const llm = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0.1,
    }).withStructuredOutput(sprintPlanSchema, { name: "SprintPlan" });

    const prompt = `You are an expert Agile Scrum Master. Given the following backlog of issues and a target team velocity of ${targetVelocity} points, recommend an optimal sprint plan.
Prioritize 'HIGH' and 'URGENT' issues. Maximize the value delivered without exceeding the target velocity by more than 10%.
If an issue has no complexity score, safely assume it is 3 points.

Backlog:
${JSON.stringify(backlog, null, 2)}
`;

    const result = await llm.invoke([
        ["system", "Recommend a realistic sprint plan by selecting an optimal subset of the provided backlog issues."],
        ["human", prompt]
    ]);

    return result as SprintPlan;
}

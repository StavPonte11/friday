import { fetchLangfuseAPI } from "./langfuse";

// Naming convention parser: `{prefix}/{branch-slug}--{prompt-name}`
export function parsePromptName(featurePromptName: string): string | null {
    const match = featurePromptName.match(/^[^\/]+\/[^\-]+--(.+)$/);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

export async function detectConflict(featurePromptName: string, productionPromptName: string) {
    try {
        const prodPrompt = await fetchLangfuseAPI(`/api/public/v2/prompts/${productionPromptName}`);
        const featurePrompt = await fetchLangfuseAPI(`/api/public/v2/prompts/${featurePromptName}`);

        // If production doesn't exist yet, no conflict
        if (!prodPrompt || !prodPrompt.version) return false;

        // A real conflict checking would compare timestamps or versions.
        // For now, if production is newer than feature creation, flag conflict
        const prodUpdatedAt = new Date(prodPrompt.lastConfigVersion?.createdAt || 0).getTime();
        const featCreatedAt = new Date(featurePrompt.createdAt || 0).getTime();

        if (prodUpdatedAt > featCreatedAt) {
            return true;
        }
        return false;
    } catch (error) {
        // If production prompt is not found, there is no conflict
        return false;
    }
}

export async function executeMerge(featurePromptName: string, productionPromptName: string) {
    try {
        // Fetch latest feature prompt
        const featurePromptResponse = await fetchLangfuseAPI(`/api/public/v2/prompts/${featurePromptName}`);

        if (!featurePromptResponse || !featurePromptResponse.prompt) {
            throw new Error(`Feature prompt not found or invalid response for: ${featurePromptName}`);
        }

        const featureConfig = featurePromptResponse.lastConfigVersion;
        if (!featureConfig || !featureConfig.prompt) {
            throw new Error(`Feature prompt config is missing or invalid for: ${featurePromptName}`);
        }

        // Create new version of production prompt
        // In Langfuse, doing a POST to /api/public/v2/prompts creates a new version
        const mergePayload = {
            name: productionPromptName,
            prompt: featureConfig.prompt,
            config: featureConfig.config || {}, // default to empty object if undefined
            isActive: true, // Auto-activate
            labels: ["production"],
            type: featurePromptResponse.type,
        };

        const mergeResponse = await fetchLangfuseAPI(`/api/public/v2/prompts`, {
            method: "POST",
            body: JSON.stringify(mergePayload),
        });

        if (!mergeResponse) {
            throw new Error(`Failed to create merged prompt for: ${productionPromptName}`);
        }

        return mergeResponse;
    } catch (error) {
        console.error(`Error during executeMerge for ${featurePromptName} -> ${productionPromptName}:`, error);
        throw error;
    }
}

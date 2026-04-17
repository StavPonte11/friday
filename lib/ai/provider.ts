import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

/**
 * Creates and configures the LLM instance based on environment variables.
 * Fallback to local Ollama if no cloud API keys are provided.
 */
export function getLLMProvider(): ChatOpenAI {
    const customUrl = process.env.LLM_URL;
    const apiKey = process.env.LLM_API_KEY;
    
    // Cloud provider or Custom OpenAI-compatible endpoint
    if (customUrl && apiKey) {
        return new ChatOpenAI({
            openAIApiKey: apiKey,
            configuration: {
                baseURL: customUrl,
            },
            modelName: process.env.AI_MODEL || "gpt-4o", // allow override
            temperature: 0,
        });
    }

    // Fallback: Local Ollama
    return new ChatOpenAI({
        openAIApiKey: "ollama",
        configuration: {
            baseURL: "http://localhost:11434/v1", // Expected to be run with ollama locally or accessible service
        },
        modelName: process.env.AI_MODEL || "llama3", // default to llama3 locally
        temperature: 0,
    });
}

/**
 * Creates and configures the Embeddings instance based on environment variables.
 */
export function getEmbeddingsProvider(): OpenAIEmbeddings {
    const customUrl = process.env.LLM_URL;
    const apiKey = process.env.LLM_API_KEY;

    if (customUrl && apiKey) {
        return new OpenAIEmbeddings({
            openAIApiKey: apiKey,
            configuration: { baseURL: customUrl },
            modelName: "text-embedding-3-small", 
        });
    }

    return new OpenAIEmbeddings({
        openAIApiKey: "ollama",
        configuration: { baseURL: "http://localhost:11434/v1" },
        modelName: "nomic-embed-text", 
    });
}

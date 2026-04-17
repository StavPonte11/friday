import { prisma } from "@/lib/prisma";
import { getEmbeddingsProvider } from "./provider";
import { PmIssue } from "@prisma/client";

const embeddings = getEmbeddingsProvider();

export async function embedText(text: string): Promise<number[]> {
    return await embeddings.embedQuery(text);
}

export async function indexIssue(issue: PmIssue) {
    const textToEmbed = `Issue: ${issue.key} - ${issue.title}\nDescription: ${issue.description || ''}`;
    const vector = await embedText(textToEmbed);
    
    const vectorString = `[${vector.join(',')}]`;
    
    await prisma.$executeRaw`DELETE FROM "MemoryEmbedding" WHERE "issueId" = ${issue.id};`;
    
    // Wait for crypto.randomUUID() available in Node env
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    
    await prisma.$executeRaw`
        INSERT INTO "MemoryEmbedding" (id, "issueId", content, embedding, "createdAt")
        VALUES (${id}, ${issue.id}, ${textToEmbed}, ${vectorString}::vector, NOW());
    `;
}

export async function searchMemory(query: string, limit = 5) {
    const vector = await embedText(query);
    const vectorString = `[${vector.join(',')}]`;
    
    const results = await prisma.$queryRaw<Array<{ issueId: string, content: string, similarity: number }>>`
        SELECT "issueId", content, 1 - (embedding <=> ${vectorString}::vector) as similarity
        FROM "MemoryEmbedding"
        ORDER BY embedding <=> ${vectorString}::vector
        LIMIT ${limit};
    `;
    
    return results;
}

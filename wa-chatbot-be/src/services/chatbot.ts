import { prisma } from '../lib/prisma';
import { generateEmbedding, generateChatCompletion } from '../utils/fireworks';

export const processChatMessage = async (message: string): Promise<string> => {
  // 1. Generate embedding for the user's message
  const queryEmbedding = await generateEmbedding(message);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // 2. Perform vector search in pgvector
  const relevantKnowledge = await prisma.$queryRaw<Array<{ id: string, content: string, distance: number }>>`
    SELECT id, content, embedding <=> ${embeddingStr}::vector as distance
    FROM "Knowledge"
    ORDER BY distance ASC
    LIMIT 3
  `;

  // 3. Construct prompt
  let context = "";
  if (relevantKnowledge.length > 0) {
    context = "Relevant information from the knowledge base:\n" + 
      relevantKnowledge.map(k => `- ${k.content}`).join('\n');
  }

  const systemPrompt = `You are a helpful WhatsApp chatbot assistant.
Use the following context to answer the user's question. If the answer is not in the context, you can say you don't know, but try to be helpful.
Be concise, friendly, and suitable for a WhatsApp message.

${context}`;

  // 4. Generate chat completion
  return await generateChatCompletion(systemPrompt, message);
};

import { prisma } from '../lib/prisma';
import { generateEmbedding, generateChatCompletion } from '../utils/fireworks';

export const processChatMessage = async (message: string, phoneNumber?: string): Promise<string> => {
  // Save the user's message (if phone number provided) so we can keep context
  if (phoneNumber) {
    // use dynamic access to avoid TS errors before Prisma client is regenerated
    await (prisma as any).message.create({ data: { phoneNumber, role: 'user', content: message } });
  }

  // 1. Generate embedding for the user's message (used for knowledge search)
  const queryEmbedding = await generateEmbedding(message);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // 2. Perform vector search in pgvector for relevant knowledge
  const relevantKnowledge = await prisma.$queryRaw<Array<{ id: string, content: string, distance: number }>>`
    SELECT id, content, embedding <=> ${embeddingStr}::vector as distance
    FROM "Knowledge"
    ORDER BY distance ASC
    LIMIT 3
  `;

  // 3. Retrieve recent messages with this phone number to keep conversational context
  let recentContext = "";
  if (phoneNumber) {
    const recent = await (prisma as any).message.findMany({
      where: { phoneNumber },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    if (recent.length > 0) {
      // reverse to show oldest -> newest
      const items: Array<{ role: string; content: string }> = recent.reverse();
      recentContext = "Recent messages with the user:\n" + items.map((m) => `- ${m.role}: ${m.content}`).join('\n');
    }
  }

  // 4. Construct prompt combining knowledge and recent conversation
  let context = "";
  if (relevantKnowledge.length > 0) {
    context += "Relevant information from the knowledge base:\n" + relevantKnowledge.map(k => `- ${k.content}`).join('\n') + '\n';
  }
  if (recentContext) context += recentContext;

  const systemPrompt = `You are a helpful WhatsApp chatbot assistant.
Use the following context to answer the user's question. If the answer is not in the context, you can say you don't know, but try to be helpful.
Be concise, friendly, and suitable for a WhatsApp message.

${context}`;

  // 5. Generate chat completion
  const reply = await generateChatCompletion(systemPrompt, message);

  // 6. Save the assistant reply to message history (if phone number provided)
  if (phoneNumber) {
    await (prisma as any).message.create({ data: { phoneNumber, role: 'assistant', content: reply } });
  }

  return reply;
};

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateEmbedding, generateChatCompletion } from '../utils/fireworks';

const router = Router();

const chatSchema = z.object({
  message: z.string(),
  // sender, etc.
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = chatSchema.parse(req.body);

    console.log(`[WA WEBHOOK] Received message: "${message}"`);

    // 1. Generate embedding for the user's message
    const queryEmbedding = await generateEmbedding(message);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // 2. Perform vector search in pgvector
    // We use <=> for cosine distance. Lower is more similar.
    // We retrieve the top 3 most relevant knowledge pieces.
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

    // 4. Generate chat completion using Fireworks AI
    const reply = await generateChatCompletion(systemPrompt, message);

    // 5. Output to log (as requested by user)
    console.log(`[WA WEBHOOK] Generated Reply:\n${reply}`);

    // Return the reply (in the real WA webhook, this might not be sent back as the HTTP response directly, 
    // but rather via a separate API call to WA API, but for now we return it).
    res.json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Error processing chat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;

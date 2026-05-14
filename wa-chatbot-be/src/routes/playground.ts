import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateEmbedding, generateChatCompletion } from '../utils/fireworks';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1),
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message } = chatSchema.parse(req.body);

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

${context}`;

    // 4. Generate chat completion using Fireworks AI
    const reply = await generateChatCompletion(systemPrompt, message);

    // Return the reply directly to the frontend playground
    res.json({ reply, contextUsed: relevantKnowledge });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Error processing playground request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;

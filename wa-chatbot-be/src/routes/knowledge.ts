import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';
import { generateEmbedding } from '../utils/fireworks';

const router = Router();

const addKnowledgeSchema = z.object({
  content: z.string().min(10),
});

router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const knowledge = await prisma.knowledge.findFirst();
    res.json({ content: knowledge?.content || '' });
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = addKnowledgeSchema.parse(req.body);

    // Generate embedding using Fireworks AI
    const embedding = await generateEmbedding(content);

    // Save to Postgres with pgvector
    // We use a raw query because Prisma's native `create` doesn't fully support inserting vector arrays elegantly without raw SQL for the vector column, 
    // though in newer versions it's supported via extension. Using a raw query is safer for vector casting.
    
    // Convert array to pgvector format '[1.1, 2.2, ...]'
    const embeddingStr = `[${embedding.join(',')}]`;

    // Clear existing knowledge base since it's just one row
    await prisma.knowledge.deleteMany();

    await prisma.$executeRaw`
      INSERT INTO "Knowledge" (id, content, embedding, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${content}, ${embeddingStr}::vector, now(), now())
    `;

    res.status(200).json({ message: 'Knowledge updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Error adding knowledge:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;

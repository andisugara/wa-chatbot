import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Zod schema for updating contact
const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  aiEnabled: z.boolean().optional(),
});

// GET /api/contacts - List all contacts
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/contacts/:id - Update contact name and/or AI status
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, aiEnabled } = updateContactSchema.parse(req.body);

    const contact = await prisma.contact.findUnique({
      where: { id: id as string },
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const updated = await prisma.contact.update({
      where: { id: id as string },
      data: {
        ...(name !== undefined && { name }),
        ...(aiEnabled !== undefined && { aiEnabled }),
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Error updating contact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /api/contacts/:phoneNumber/history - Get chat history
router.get('/:phoneNumber/history', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.params;

    const messages = await (prisma as any).message.findMany({
      where: { phoneNumber },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

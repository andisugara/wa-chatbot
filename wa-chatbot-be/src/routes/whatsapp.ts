import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { getWAStatus, logoutWA } from '../services/whatsapp';

const router = Router();

// Get WhatsApp connection status and QR code
router.get('/status', authenticateToken, (req: Request, res: Response) => {
  const statusInfo = getWAStatus();
  res.json(statusInfo);
});

// Logout and restart WhatsApp connection
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  await logoutWA();
  res.json({ message: 'Logged out successfully' });
});

export default router;

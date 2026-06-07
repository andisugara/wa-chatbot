import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/authMiddleware';
import path from 'path';
import fs from 'fs';

const router = Router();

// Helper to resolve the correct images directory
const getImagesDir = () => {
  const dockerPath = '/app/images';
  if (fs.existsSync(dockerPath)) {
    return dockerPath;
  }
  const localPath = path.resolve(__dirname, '../../../images');
  if (!fs.existsSync(localPath)) {
    fs.mkdirSync(localPath, { recursive: true });
  }
  return localPath;
};

const uploadImageSchema = z.object({
  name: z.string().min(1),
  filename: z.string().min(1),
  base64: z.string().min(1),
});

// GET /api/images - List all images
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const images = await prisma.image.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Make URL dynamic based on backend host
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imagesWithUrls = images.map(img => ({
      ...img,
      url: `${baseUrl}/images/${img.filename}`
    }));

    res.json(imagesWithUrls);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/images - Upload an image
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, filename: suggestedFilename, base64 } = uploadImageSchema.parse(req.body);

    // Get clean, unique filename
    const extension = path.extname(suggestedFilename) || '.png';
    const baseName = path.basename(suggestedFilename, extension).replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${baseName}_${Date.now()}${extension}`;

    const imagesDir = getImagesDir();
    const filePath = path.join(imagesDir, filename);

    // Extract base64 content
    const match = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const base64Data = match ? match[2] : base64;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Save file to disk
    fs.writeFileSync(filePath, fileBuffer);

    // Save to DB
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `/images/${filename}`; // Store relative, resolve absolute dynamically on read

    const newImage = await prisma.image.create({
      data: {
        name,
        filename,
        url,
      },
    });

    res.status(201).json({
      ...newImage,
      url: `${baseUrl}/images/${filename}`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
    } else {
      console.error('Error uploading image:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// DELETE /api/images/:id - Delete an image
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const image = await prisma.image.findUnique({
      where: { id: id as string },
    });

    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    // Remove file from disk
    const imagesDir = getImagesDir();
    const filePath = path.join(imagesDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await prisma.image.delete({
      where: { id: id as string },
    });

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

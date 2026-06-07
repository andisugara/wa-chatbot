import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import knowledgeRoutes from './routes/knowledge';
import chatRoutes from './routes/chat';
import playgroundRoutes from './routes/playground';
import whatsappRoutes from './routes/whatsapp';
import contactsRoutes from './routes/contacts';
import imagesRoutes from './routes/images';
import { initWhatsApp } from './services/whatsapp';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Resolve images directory
const getImagesDir = () => {
  const dockerPath = '/app/images';
  if (fs.existsSync(dockerPath)) {
    return dockerPath;
  }
  const localPath = path.resolve(__dirname, '../../images');
  if (!fs.existsSync(localPath)) {
    fs.mkdirSync(localPath, { recursive: true });
  }
  return localPath;
};

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase body size limit for base64 uploads

// Serve images statically
app.use('/images', express.static(getImagesDir()));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/images', imagesRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server is running on port ${port} (0.0.0.0)`);
  initWhatsApp().catch(console.error);
});


import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import knowledgeRoutes from './routes/knowledge';
import chatRoutes from './routes/chat';
import playgroundRoutes from './routes/playground';
import whatsappRoutes from './routes/whatsapp';
import { initWhatsApp } from './services/whatsapp';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  initWhatsApp().catch(console.error);
});

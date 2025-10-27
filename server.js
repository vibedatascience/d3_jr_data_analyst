import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleChat } from './routes/chat.js';
import { PORT, ANTHROPIC_API_KEY } from './config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.post('/api/chat', handleChat);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n═══════════════════════════════════════');
  console.log('🚀 D3.JS VISUALIZATION CHATBOT SERVER');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
  console.log(`✅ API key: ${ANTHROPIC_API_KEY ? '***configured***' : '⚠️  MISSING'}`);
  console.log('═══════════════════════════════════════\n');
});

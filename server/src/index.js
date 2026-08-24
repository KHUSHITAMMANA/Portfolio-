import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 5001);
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const clientDist = path.resolve(currentDirectory, '../../client/dist');
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_request, response) => response.json({ ok: true }));

app.post('/api/contact', async (request, response) => {
  const { name, email, message } = request.body || {};
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') return response.status(400).json({ message: 'Name, email, and message are required.' });
  if (!name.trim() || !email.trim() || !message.trim()) return response.status(400).json({ message: 'Name, email, and message are required.' });
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return response.status(400).json({ message: 'Please provide a valid email address.' });
  if (name.trim().length > 100 || email.trim().length > 254 || message.trim().length > 5000) return response.status(400).json({ message: 'One or more fields are too long.' });
  if (!supabase) return response.status(503).json({ message: 'Contact service is not configured yet.' });

  try {
    const { error } = await supabase.from('contacts').insert({ name: name.trim(), email: email.trim().toLowerCase(), message: message.trim() });
    if (error) throw error;
    return response.status(201).json({ message: 'Message received.' });
  } catch (error) {
    console.error('Contact submission failed:', error.message);
    return response.status(500).json({ message: 'Unable to save your message right now.' });
  }
});

app.use(express.static(clientDist));
app.get('*', (_request, response) => response.sendFile(path.join(clientDist, 'index.html')));

const server = app.listen(port, () => console.log(`Portfolio API listening on port ${port}`));

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing Node process or set a different PORT in server/.env.`);
  } else {
    console.error('Server failed to start:', error.message);
  }
  process.exit(1);
});

import dotenv from 'dotenv';
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
dotenv.config({ path: path.resolve(currentDirectory, '../.env') });
const clientDist = path.resolve(currentDirectory, '../../client/dist');
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const groqModel = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';
const portfolioKnowledge = [
  'Rukhayya Banu is a Bachelor of Computer Applications graduate based in Karnataka, India.',
  'Rukhayya builds dependable digital products across thoughtful interfaces, resilient systems, and user needs.',
  'Core frontend skills include React, TypeScript, Next.js, design systems, and accessibility.',
  'Backend skills include Node.js, Express, PostgreSQL, REST APIs, and Supabase.',
  'Cloud and delivery skills include AWS Lambda, S3, CloudFront, Docker, CI/CD, Git, Figma, Playwright, Storybook, and Linear.',
  'Experience: Senior Product Engineer at Independent from 2021 to present, shaping products from prototype to sustainable systems and leading technical direction and product discovery.',
  'Experience: Product Engineer at Common Thread from 2018 to 2021, building accessible web products and a component library.',
  'Experience: Frontend Developer at North Studio from 2016 to 2018, translating brand systems into responsive digital experiences.',
  'Education: BCA, Computer Applications, in Karnataka, India.',
  'Project Northstar is a distributed-team command center built with React, Node, and PostgreSQL; it improved weekly planning speed by 42%.',
  'Project Field Notes is an editorial publishing workflow built with Next.js, Supabase, and S3; it produced 2.4 times more repeat readers.',
  'Project Good Energy is a renewable-energy storefront built with React, Express, and Stripe; it delivered an 18-point lift in product clarity.',
  'The portfolio is a React and Vite frontend with an Express API. The contact form validates input, applies rate limiting, and stores messages in Supabase PostgreSQL.',
];

function retrieveKnowledge(query) {
  const terms = query.toLowerCase().match(/[a-z0-9]+/g) || [];
  return portfolioKnowledge
    .map((document) => ({
      document,
      score: terms.reduce((score, term) => score + (document.toLowerCase().includes(term) ? 1 : 0), 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 4)
    .map(({ document }) => document);
}

function cleanAnswer(answer) {
  return answer.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_request, response) => response.json({
  ok: true,
  groqConfigured: Boolean(process.env.GROQ_API_KEY),
  groqModel,
}));

app.post('/api/chat', async (request, response) => {
  const { message, history = [] } = request.body || {};
  if (typeof message !== 'string' || !message.trim()) return response.status(400).json({ message: 'Please enter a question.' });
  if (message.trim().length > 1000) return response.status(400).json({ message: 'Please keep questions under 1000 characters.' });
  if (!process.env.GROQ_API_KEY) return response.status(503).json({ message: 'The assistant is not configured yet.' });

  const retrievedKnowledge = retrieveKnowledge(message);
  const context = (retrievedKnowledge.length ? retrievedKnowledge : portfolioKnowledge.slice(0, 2)).join('\n');
  const safeHistory = Array.isArray(history)
    ? history.filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-6)
    : [];

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          { role: 'system', content: `You are Rukhayya Banu's portfolio assistant. Answer politely and concisely using only the portfolio context below. If the answer is not in the context, say you do not have that information and suggest contacting Rukhayya. Never invent experience, links, contact details, or technical claims. Return only the final answer; never include hidden reasoning, thinking tags, or analysis.\n\nPortfolio context:\n${context}` },
          ...safeHistory,
          { role: 'user', content: message.trim() },
        ],
      }),
    });
    const groqText = await groqResponse.text();
    let groqData = {};
    try { groqData = groqText ? JSON.parse(groqText) : {}; } catch { groqData = {}; }
    if (!groqResponse.ok) throw new Error(groqData.error?.message || `Groq request failed with status ${groqResponse.status}.`);
    const answer = cleanAnswer(groqData.choices?.[0]?.message?.content || '');
    if (!answer) throw new Error('Groq returned an empty answer.');
    return response.json({ answer });
  } catch (error) {
    console.error('Chat request failed:', error.message);
    return response.status(502).json({ message: `Assistant error: ${error.message}` });
  }
});

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

app.use('/api', (_request, response) => response.status(404).json({ message: 'API endpoint not found.' }));
app.use(express.static(clientDist));
app.get('*', (_request, response) => response.sendFile(path.join(clientDist, 'index.html')));

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Request body must be valid JSON.' });
  }
  console.error('Unhandled server error:', error.message);
  return response.status(500).json({ message: 'Unexpected server error.' });
});

const server = app.listen(port, () => console.log(`Portfolio API listening on port ${port}`));

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing Node process or set a different PORT in server/.env.`);
  } else {
    console.error('Server failed to start:', error.message);
  }
  process.exit(1);
});

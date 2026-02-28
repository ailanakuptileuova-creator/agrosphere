import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Groq from 'groq-sdk';

const JWT_SECRET = process.env.JWT_SECRET || 'agro-sphere-secret-2026';

// In-memory stores — persist while the Lambda instance is warm.
// Data is lost on cold starts; acceptable for a demo deployment.
const users = new Map<string, { id: number; username: string; password: string }>();
let userIdCounter = 1;

interface SessionRecord {
  id: number;
  user_id: number;
  location: string;
  data: string;
  timestamp: string;
}
const sessionsByUser = new Map<number, SessionRecord[]>();
let sessionIdCounter = 1;

let groqClient: Groq | null = null;
function getGroq(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

function routePath(query: VercelRequest['query']): string {
  const p = query.path;
  if (Array.isArray(p)) return p.join('/');
  if (typeof p === 'string') return p;
  return '';
}

function decodeToken(authHeader: string | undefined): { id: number; username: string } | null {
  if (!authHeader) return null;
  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET) as { id: number; username: string };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = routePath(req.query);
  const method = req.method?.toUpperCase();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (method === 'OPTIONS') return res.status(200).end();

  // ── Registration ──────────────────────────────────────────────
  if (route === 'auth/register' && method === 'POST') {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (users.has(username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    users.set(username, { id: userIdCounter++, username, password: hashed });
    return res.json({ success: true });
  }

  // ── Login ─────────────────────────────────────────────────────
  if (route === 'auth/login' && method === 'POST') {
    const { username, password } = req.body ?? {};
    const user = users.get(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      return res.json({ token, username: user.username });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // ── AI Analysis (Groq proxy) ─────────────────────────────────
  if (route === 'ai/analyze' && method === 'POST') {
    const groq = getGroq();
    if (!groq) {
      return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server' });
    }

    const { prompt, context } = req.body ?? {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const loc = context?.location
      ? `${context.location.lat.toFixed(4)}, ${context.location.lng.toFixed(4)}`
      : 'Global / Not specified';
    const layer = context?.layer ?? 'ndvi';
    const horizon = context?.horizon ?? 'present';
    const uiLanguage = context?.uiLanguage ?? 'en';

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: [
              'You are AgroSphere AI, a senior satellite data analyst and agronomist.',
              'Provide technical, data-driven advice for farmers and investors.',
              "If a location is provided, focus your analysis on that specific region's climate, soil, common crops, vegetation indices (NDVI, EVI), moisture, yield potential and degradation risk.",
              '',
              'Always answer in the SAME language as the user\'s question.',
              'If UI language is provided, you may slightly adapt tone/terminology to that locale, but do NOT switch to another language than the question.',
              'Use clean markdown for structure (headings, bullet points, tables when helpful).',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              `User Question: ${prompt}`,
              '',
              'Current Context:',
              `- Location: ${loc}`,
              `- Analysis Layer: ${layer}`,
              `- Time Horizon: ${horizon}`,
              `- UI Language: ${uiLanguage}`,
            ].join('\n'),
          },
        ],
        temperature: 0.4,
        max_tokens: 1024,
      });

      const text =
        completion.choices?.[0]?.message?.content ??
        'Извини, модель Groq не вернула ответ.';
      return res.json({ text });
    } catch (e) {
      console.error('Groq error:', e);
      return res.status(500).json({ error: 'AI Analysis failed' });
    }
  }

  // ── Sessions ──────────────────────────────────────────────────
  if (route === 'sessions') {
    const decoded = decodeToken(req.headers.authorization);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

    if (method === 'POST') {
      const { location, data } = req.body ?? {};
      const record: SessionRecord = {
        id: sessionIdCounter++,
        user_id: decoded.id,
        location: location || '',
        data: typeof data === 'string' ? data : JSON.stringify(data),
        timestamp: new Date().toISOString(),
      };
      const list = sessionsByUser.get(decoded.id) || [];
      list.unshift(record);
      sessionsByUser.set(decoded.id, list.slice(0, 20));
      return res.json({ success: true });
    }

    if (method === 'GET') {
      const list = sessionsByUser.get(decoded.id) || [];
      return res.json(list.slice(0, 5));
    }
  }

  return res.status(404).json({ error: 'Not found' });
}

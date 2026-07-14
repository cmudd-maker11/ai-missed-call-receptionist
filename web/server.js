// web/server.js
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { createBrain } from '../src/brain/claude.js';
import { createSchedulingSim } from '../src/adapters/scheduling/simulation.js';
import { ConversationEngine } from '../src/engine.js';
import { createWebMessaging } from './adapters/web-messaging.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const REPO_URL = 'https://github.com/cmudd-maker11/ai-missed-call-receptionist';

const log = (level, msg) =>
  console.log(`[${new Date().toISOString()}] [${level}] [web] ${msg}`);

const utcDayKey = (d) => d.toISOString().slice(0, 10);
const randomPhone = () => '+1555' + Math.floor(1000000 + Math.random() * 8999999);

// Build the production engine (real Claude with a key, mock without).
export function buildEngine() {
  const cfg = loadConfig();
  const db = openDb(':memory:');
  const messaging = createWebMessaging();
  const scheduling = createSchedulingSim(cfg.business);
  const brain = createBrain({ apiKey: cfg.apiKey, model: cfg.model });
  const engine = new ConversationEngine({ business: cfg.business, db, messaging, scheduling, brain });
  return { engine, messaging, db, business: cfg.business, isMock: brain.isMock };
}

export function createApp({ engine, messaging, db, business, limits = {} } = {}) {
  const L = {
    maxPerSession: 15,
    maxPerDay: 400,
    maxInputChars: 500,
    rateWindowMs: 60 * 1000,
    rateMax: 30,
    sessionTtlMs: 30 * 60 * 1000,
    ...limits,
  };

  const sessions = new Map(); // sessionId -> { leadId, phone, count, createdAt }
  const ipHits = new Map();   // ip -> [timestamps]
  const day = { key: utcDayKey(new Date()), count: 0 };

  function bumpDay() {
    const k = utcDayKey(new Date());
    if (k !== day.key) { day.key = k; day.count = 0; }
  }
  function overDaily() { bumpDay(); return day.count >= L.maxPerDay; }
  function rateLimited(ip) {
    const now = Date.now();
    const hits = (ipHits.get(ip) || []).filter((t) => t > now - L.rateWindowMs);
    hits.push(now);
    ipHits.set(ip, hits);
    return hits.length > L.rateMax;
  }
  function sweepSessions() {
    const cutoff = Date.now() - L.sessionTtlMs;
    for (const [id, s] of sessions) if (s.createdAt < cutoff) sessions.delete(id);
  }

  const DAILY_MSG = `That is the live demo's limit for today. It runs on a small budget so it can stay free. You can clone the repo and run it yourself: ${REPO_URL}`;

  const app = express();
  app.use(express.json({ limit: '16kb' }));
  app.use(express.static(PUBLIC_DIR));

  app.post('/api/start', async (req, res) => {
    try {
      const ip = req.ip || 'unknown';
      if (rateLimited(ip)) return res.json({ success: true, sessionId: null, replies: ['One moment, that is a lot of requests. Try again shortly.'], done: true });
      if (overDaily()) return res.json({ success: true, sessionId: null, replies: [DAILY_MSG], done: true });
      sweepSessions();
      const phone = randomPhone();
      const { leadId } = await engine.startCall({ phone });
      day.count += 1;
      const replies = messaging.drain(phone);
      sessions.set(leadId, { leadId, phone, count: 0, createdAt: Date.now() });
      res.json({ success: true, sessionId: leadId, replies, done: false });
    } catch (err) {
      log('ERROR', `start failed: ${err.message}`);
      res.status(500).json({ success: false, replies: ['Something went wrong starting the demo. Refresh to try again.'], done: true });
    }
  });

  app.post('/api/message', async (req, res) => {
    try {
      const { sessionId, text } = req.body || {};
      const s = sessions.get(sessionId);
      if (!s) return res.status(404).json({ success: false, replies: ['This demo session expired. Refresh to start a new one.'], done: true });
      const ip = req.ip || 'unknown';
      const body = typeof text === 'string' ? text : '';
      if (!body.trim()) return res.json({ success: true, replies: [], done: false });
      if (body.length > L.maxInputChars) return res.json({ success: true, replies: ['That message is a bit long for the demo. Try a shorter one.'], done: false });
      if (s.count >= L.maxPerSession) return res.json({ success: true, replies: ["That is the demo limit for this chat. Refresh the page to start over."], done: true });
      if (rateLimited(ip)) return res.json({ success: true, replies: ['One moment, too many messages too fast. Try again in a few seconds.'], done: false });
      if (overDaily()) return res.json({ success: true, replies: [DAILY_MSG], done: true });

      s.count += 1;
      day.count += 1;
      await engine.handleMessage({ leadId: s.leadId, text: body });
      const replies = messaging.drain(s.phone);
      const lead = db.getLead(s.leadId);
      const state = lead ? lead.state : null;
      const done = state === 'BOOKED' || state === 'ESCALATED';
      res.json({ success: true, replies, done, state });
    } catch (err) {
      log('ERROR', `message failed: ${err.message}`);
      res.status(500).json({ success: false, replies: ['Something went wrong. Refresh to start over.'], done: true });
    }
  });

  return app;
}

// Start the server when run directly (node web/server.js).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { engine, messaging, db, business, isMock } = buildEngine();
  const app = createApp({ engine, messaging, db, business });
  const port = process.env.PORT || 3000;
  app.listen(port, () => log('INFO', `Receptionist web demo on :${port} (${isMock ? 'mock mode — set ANTHROPIC_API_KEY for real Claude' : 'live Claude'})`));
}

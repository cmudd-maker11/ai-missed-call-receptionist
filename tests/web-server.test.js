// tests/web-server.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createBrain } from '../src/brain/claude.js';
import { createSchedulingSim } from '../src/adapters/scheduling/simulation.js';
import { ConversationEngine } from '../src/engine.js';
import { createWebMessaging } from '../web/adapters/web-messaging.js';
import { createApp } from '../web/server.js';

const business = {
  name: 'Comfort Pros', servedZips: ['60187'], services: ['heating'],
  hours: { start: 8, end: 17 }, slotMinutes: 120, daysAhead: 5, busy: [],
  tone: 'friendly',
};

function makeApp(limits = {}) {
  const db = openDb(':memory:');
  const messaging = createWebMessaging();
  const scheduling = createSchedulingSim(business);
  const brain = createBrain({ apiKey: '' }); // mock, deterministic, offline
  const engine = new ConversationEngine({
    business, db, messaging, scheduling, brain,
    now: () => new Date('2026-07-10T09:00:00'),
  });
  return createApp({ engine, messaging, db, business, limits });
}

async function withServer(app, fn) {
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const post = (path, body) => fetch(base + path, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  }).then((r) => r.json());
  try { await fn({ base, post }); } finally { server.close(); }
}

test('start returns a greeting; a full conversation reaches BOOKED', async () => {
  await withServer(makeApp(), async ({ post }) => {
    const started = await post('/api/start', {});
    assert.ok(started.sessionId);
    assert.equal(started.replies.length >= 1, true);
    assert.equal(started.done, false);
    const id = started.sessionId;

    await post('/api/message', { sessionId: id, text: 'my furnace died, no heat, freezing' });
    await post('/api/message', { sessionId: id, text: "I'm at 60187" });
    const last = await post('/api/message', { sessionId: id, text: 'the first one works' });
    assert.equal(last.done, true);
    assert.equal(last.state, 'BOOKED');
  });
});

test('unknown session returns 404', async () => {
  await withServer(makeApp(), async ({ base }) => {
    const r = await fetch(base + '/api/message', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 'nope', text: 'hi' }),
    });
    assert.equal(r.status, 404);
  });
});

test('per-session message cap stops the chat without erroring', async () => {
  await withServer(makeApp({ maxPerSession: 1 }), async ({ post }) => {
    const { sessionId } = await post('/api/start', {});
    await post('/api/message', { sessionId, text: 'first message' }); // count -> 1
    const over = await post('/api/message', { sessionId, text: 'second message' });
    assert.equal(over.done, true);
    assert.match(over.replies.join(' ').toLowerCase(), /demo limit|start over|refresh/);
  });
});

test('global daily budget gate trips and stops calling the engine', async () => {
  await withServer(makeApp({ maxPerDay: 1 }), async ({ post }) => {
    // start consumes the 1 daily unit (greeting call)
    const { sessionId } = await post('/api/start', {});
    const gated = await post('/api/message', { sessionId, text: 'hello there' });
    assert.match(gated.replies.join(' ').toLowerCase(), /today'?s limit|clone the repo|come back/);
  });
});

test('oversized input is rejected politely', async () => {
  await withServer(makeApp({ maxInputChars: 10 }), async ({ post }) => {
    const { sessionId } = await post('/api/start', {});
    const r = await post('/api/message', { sessionId, text: 'x'.repeat(50) });
    assert.match(r.replies.join(' ').toLowerCase(), /shorter|too long/);
  });
});

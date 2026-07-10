// tests/engine.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createBrain } from '../src/brain/claude.js';
import { createMessagingSim } from '../src/adapters/messaging/simulation.js';
import { createSchedulingSim } from '../src/adapters/scheduling/simulation.js';
import { ConversationEngine } from '../src/engine.js';

const business = {
  name: 'Comfort Pros', servedZips: ['60187'], services: ['heating'],
  hours: { start: 8, end: 17 }, slotMinutes: 120, daysAhead: 3, busy: [],
  tone: 'friendly',
};

function makeEngine() {
  const db = openDb(':memory:');
  const messaging = createMessagingSim({ silent: true });
  const scheduling = createSchedulingSim(business);
  const brain = createBrain({ apiKey: '' }); // mock
  const engine = new ConversationEngine({ business, db, messaging, scheduling, brain, now: () => new Date('2026-07-10T09:00:00') });
  return { engine, messaging, db };
}

test('happy path reaches BOOKED and writes a booking', async () => {
  const { engine, messaging, db } = makeEngine();
  const { leadId } = await engine.startCall({ phone: '+16305551234' });
  assert.equal(messaging.transcript.length, 1); // greeting

  await engine.handleMessage({ leadId, text: "my furnace died, no heat, freezing" });
  await engine.handleMessage({ leadId, text: "I'm at 60187" });
  // by now slots should have been offered
  const lead1 = db.getLead(leadId);
  assert.equal(lead1.state, 'CONFIRM');

  await engine.handleMessage({ leadId, text: "the first one works" });
  const lead2 = db.getLead(leadId);
  assert.equal(lead2.state, 'BOOKED');
  const booking = db.getBookingByLead(leadId);
  assert.ok(booking, 'a booking row exists');
});

test('anger escalates and stops the AI', async () => {
  const { engine, db } = makeEngine();
  const { leadId } = await engine.startCall({ phone: '+16305550000' });
  await engine.handleMessage({ leadId, text: 'this is unacceptable, let me talk to a human' });
  assert.equal(db.getLead(leadId).state, 'ESCALATED');
});

test('out-of-area escalates', async () => {
  const { engine, db } = makeEngine();
  const { leadId } = await engine.startCall({ phone: '+16305550001' });
  await engine.handleMessage({ leadId, text: 'no heat, furnace broken, I am at 99999' });
  assert.equal(db.getLead(leadId).state, 'ESCALATED');
});

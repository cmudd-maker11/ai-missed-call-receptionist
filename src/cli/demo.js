// src/cli/demo.js
import { loadConfig } from '../config.js';
import { openDb } from '../db.js';
import { createBrain } from '../brain/claude.js';
import { createMessagingSim } from '../adapters/messaging/simulation.js';
import { createSchedulingSim } from '../adapters/scheduling/simulation.js';
import { ConversationEngine } from '../engine.js';

const cfg = loadConfig();
const db = openDb(':memory:');
const messaging = createMessagingSim({ label: cfg.business.name });
const scheduling = createSchedulingSim(cfg.business);
const brain = createBrain({ apiKey: cfg.apiKey, model: cfg.model });

const engine = new ConversationEngine({ business: cfg.business, db, messaging, scheduling, brain });

// Small pauses so the transcript reads like a real back-and-forth text thread.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CALLER = [
  "Hey, my furnace just quit and there's no heat at all, it's freezing in here",
  "I'm over at 60187",
  "The first one works great",
];

function callerLine(text) {
  console.log(`  [Caller] ${text}`);
}

const banner = (t) => console.log(`\n=== ${t} ===\n`);

async function run() {
  banner(`${cfg.business.name} — AI Missed-Call Receptionist ${brain.isMock ? '(mock mode)' : '(live Claude)'}`);
  console.log('  * Ring... ring... missed call. The AI texts the caller back:\n');
  await sleep(900);
  const { leadId } = await engine.startCall({ phone: '+16305551234' });

  for (const line of CALLER) {
    await sleep(1100);
    console.log('');
    callerLine(line);
    await sleep(700);
    await engine.handleMessage({ leadId, text: line });
  }

  await sleep(900);
  const booking = db.getBookingByLead(leadId);
  banner('Result');
  if (booking) {
    console.log(`  ✅ Booked: ${booking.slot_start} → ${booking.slot_end} (${booking.service_type})`);
    console.log(`  Lead status: ${db.getLead(leadId).status}`);
  } else {
    console.log(`  Final state: ${db.getLead(leadId).state}`);
  }
  console.log('');
}

run();

// src/cli/chat.js
import readline from 'node:readline';
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

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function run() {
  console.log(`\n=== ${cfg.business.name} — you are the CALLER ${brain.isMock ? '(mock mode)' : '(live Claude)'} ===`);
  console.log('You just called and no one answered. The AI is about to text you back.');
  console.log('(type "quit" to exit)\n');

  const { leadId } = await engine.startCall({ phone: '+16305559999' });

  while (true) {
    const lead = db.getLead(leadId);
    if (lead.state === 'BOOKED' || lead.state === 'ESCALATED') {
      console.log(`\n[conversation ended: ${lead.state}]`);
      const b = db.getBookingByLead(leadId);
      if (b) console.log(`Booked ${b.slot_start} → ${b.slot_end}`);
      break;
    }
    const text = await ask('  [You] ');
    if (text.trim().toLowerCase() === 'quit') break;
    await engine.handleMessage({ leadId, text });
  }
  rl.close();
}

run();

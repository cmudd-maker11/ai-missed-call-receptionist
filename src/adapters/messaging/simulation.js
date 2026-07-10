// src/adapters/messaging/simulation.js
// MessagingAdapter (simulation). Interface: send(to, body) -> { id }
import { randomUUID } from 'node:crypto';

const mask = (p) => (p ? `***-***-${String(p).slice(-4)}` : 'unknown');

export function createMessagingSim({ silent = false, label = 'AI' } = {}) {
  const transcript = [];
  return {
    transcript,
    send(to, body) {
      const id = randomUUID();
      transcript.push({ to, body, at: new Date().toISOString() });
      if (!silent) console.log(`  [${label} → ${mask(to)}] ${body}`);
      return { id };
    },
  };
}

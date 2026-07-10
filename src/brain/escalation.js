// src/brain/escalation.js
const TRIGGERS = [
  'unacceptable', 'ridiculous', 'furious', 'angry', 'lawsuit', 'sue you', 'refund',
  'talk to a human', 'speak to a human', 'real person', 'talk to someone',
  'speak to a manager', 'talk to a manager',
];

export function shouldEscalate(message) {
  const lower = String(message || '').toLowerCase();
  return TRIGGERS.some((phrase) => lower.includes(phrase));
}

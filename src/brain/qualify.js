// src/brain/qualify.js
const REQUIRED = ['service_type', 'urgency', 'zip'];

const SERVICE_PATTERNS = [
  [/water heater/, 'water heater'],
  [/thermostat/, 'thermostat'],
  [/furnace|no heat|heating|heater|heat\b/, 'heating'],
  [/\bac\b|air condition|cooling|a\/c|no cool/, 'cooling'],
];

const EMERGENCY = /no heat|no cool|not working|won'?t (turn on|start|run)|emergency|leak|flood|smell(s)? gas|freezing|no (ac|a\/c)|stopped (working)?|urgent|asap|today|right now/;
const ROUTINE = /maintenance|tune.?up|check.?up|quote|estimate|inspection|sometime|no rush|whenever/;

export function extractFieldsFallback(text) {
  const lower = String(text || '').toLowerCase();
  let service_type = null;
  for (const [re, label] of SERVICE_PATTERNS) {
    if (re.test(lower)) { service_type = label; break; }
  }
  let urgency = null;
  if (EMERGENCY.test(lower)) urgency = 'emergency';
  else if (ROUTINE.test(lower)) urgency = 'routine';
  const zipMatch = lower.match(/\b(\d{5})\b/);
  const zip = zipMatch ? zipMatch[1] : null;
  return { service_type, urgency, zip };
}

export function mergeFields(existing, incoming) {
  const out = { ...existing };
  for (const k of REQUIRED) {
    if (!out[k] && incoming && incoming[k]) out[k] = incoming[k];
  }
  return out;
}

export function missingFields(fields) {
  return REQUIRED.filter((k) => !fields[k]);
}

export function checkServiceArea(zip, servedZips) {
  return servedZips.includes(String(zip));
}

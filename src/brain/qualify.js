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

const VALID_URGENCY = new Set(['emergency', 'routine']);

// Validate a raw extracted object into clean {service_type, urgency, zip}.
// Anything the model returns that isn't a real service/urgency/ZIP is dropped to null.
export function normalizeFields(raw, services = []) {
  const out = { service_type: null, urgency: null, zip: null };
  if (!raw || typeof raw !== 'object') return out;
  const svcList = services.map((s) => s.toLowerCase());
  if (typeof raw.service_type === 'string') {
    const s = raw.service_type.toLowerCase().trim();
    if (svcList.includes(s)) out.service_type = s;
  }
  if (typeof raw.urgency === 'string') {
    const u = raw.urgency.toLowerCase().trim();
    if (VALID_URGENCY.has(u)) out.urgency = u;
  }
  if (raw.zip != null) {
    const z = String(raw.zip).trim();
    if (/^\d{5}$/.test(z)) out.zip = z;
  }
  return out;
}

// Ask Claude to pull the fields out of a free-form caller message.
export async function extractFieldsLLM(brain, text, services = []) {
  const list = services.length ? services.join(', ') : 'heating, cooling, water heater, thermostat';
  const system = 'You extract structured fields from a home-service caller message and respond with only a JSON object, no prose.';
  const prompt = [
    'Extract these fields from the caller message:',
    `- service_type: one of [${list}], or null if unclear`,
    '- urgency: "emergency" if something is broken, not working, leaking, or urgent; "routine" for maintenance/quotes/no rush; null if unclear',
    '- zip: a 5-digit US ZIP code if present, else null',
    '',
    `Caller message: "${text}"`,
    '',
    'Respond with only: {"service_type": ..., "urgency": ..., "zip": ...}',
  ].join('\n');
  return brain.extractJSON({ system, prompt });
}

// The one call the engine uses. Claude leads when a key is present; the regex
// fallback backfills any field Claude leaves null. Mock mode uses regex only,
// which keeps the demo and the test suite fully deterministic and offline.
export async function resolveFields({ brain, text, services = [] }) {
  const regex = extractFieldsFallback(text);
  if (!brain || brain.isMock) return regex;
  try {
    const llm = normalizeFields(await extractFieldsLLM(brain, text, services), services);
    return mergeFields(llm, regex);
  } catch {
    return regex;
  }
}

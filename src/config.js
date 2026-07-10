// src/config.js
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadConfig() {
  const business = JSON.parse(
    readFileSync(join(__dirname, '..', 'business.config.json'), 'utf8')
  );
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  return {
    business,
    apiKey,
    model: process.env.AI_MODEL || 'claude-haiku-4-5-20251001',
    isMock: !apiKey,
    dbPath: join(__dirname, '..', 'data', 'receptionist.db'),
  };
}

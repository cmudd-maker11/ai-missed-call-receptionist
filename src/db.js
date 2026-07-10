// src/db.js
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      name TEXT,
      service_type TEXT,
      urgency TEXT,
      zip TEXT,
      status TEXT DEFAULT 'new',
      state TEXT DEFAULT 'GREET',
      source TEXT DEFAULT 'missed_call',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      message TEXT NOT NULL,
      state TEXT,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      slot_start TEXT NOT NULL,
      slot_end TEXT NOT NULL,
      service_type TEXT,
      status TEXT DEFAULT 'confirmed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const ALLOWED = new Set(['name', 'service_type', 'urgency', 'zip', 'status', 'state']);

  return {
    raw: db,
    createLead({ phone, source }) {
      const id = randomUUID();
      db.prepare('INSERT INTO leads (id, phone, source) VALUES (?, ?, ?)')
        .run(id, phone, source || 'missed_call');
      return id;
    },
    getLead(id) {
      return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    },
    setLeadFields(id, fields) {
      const entries = Object.entries(fields).filter(([k, v]) => ALLOWED.has(k) && v !== undefined);
      if (!entries.length) return;
      const set = entries.map(([k]) => `${k} = ?`).join(', ');
      db.prepare(`UPDATE leads SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(...entries.map(([, v]) => v), id);
    },
    addMessage({ leadId, direction, message, state }) {
      const id = randomUUID();
      db.prepare('INSERT INTO conversations (id, lead_id, direction, message, state) VALUES (?, ?, ?, ?, ?)')
        .run(id, leadId, direction, message, state || null);
      return id;
    },
    getMessages(leadId, limit = 20) {
      return db.prepare('SELECT * FROM conversations WHERE lead_id = ? ORDER BY sent_at ASC LIMIT ?')
        .all(leadId, limit);
    },
    createBooking({ leadId, slotStart, slotEnd, serviceType }) {
      const id = randomUUID();
      db.prepare('INSERT INTO bookings (id, lead_id, slot_start, slot_end, service_type) VALUES (?, ?, ?, ?, ?)')
        .run(id, leadId, slotStart, slotEnd, serviceType || null);
      return id;
    },
    getBookingByLead(leadId) {
      return db.prepare('SELECT * FROM bookings WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1').get(leadId);
    },
  };
}

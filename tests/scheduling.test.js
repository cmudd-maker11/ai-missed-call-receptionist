// tests/scheduling.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchedulingSim } from '../src/adapters/scheduling/simulation.js';

const cfg = {
  hours: { start: 8, end: 17 }, slotMinutes: 120, daysAhead: 3, busy: [],
};
const NOW = new Date('2026-07-10T09:00:00'); // a Friday

test('getOpenSlots returns future slots with label/start/end', () => {
  const sched = createSchedulingSim(cfg);
  const slots = sched.getOpenSlots({ from: NOW, urgency: 'routine' });
  assert.ok(slots.length >= 3);
  for (const s of slots) {
    assert.ok(s.start && s.end && s.label);
    assert.ok(new Date(s.start) > NOW);
  }
});

test('booking a slot removes it from future open slots and returns a booking', () => {
  const sched = createSchedulingSim(cfg);
  const [first] = sched.getOpenSlots({ from: NOW, urgency: 'routine' });
  const booking = sched.book({ slot: first, lead: { id: 'L1' } });
  assert.equal(booking.start, first.start);
  const after = sched.getOpenSlots({ from: NOW, urgency: 'routine' });
  assert.ok(!after.find((s) => s.start === first.start));
});

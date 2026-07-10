// tests/adapters-contract.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMessagingSim } from '../src/adapters/messaging/simulation.js';
import { createSchedulingSim } from '../src/adapters/scheduling/simulation.js';

test('messaging adapters expose send()', () => {
  const sim = createMessagingSim({ silent: true });
  assert.equal(typeof sim.send, 'function');
});

test('scheduling adapters expose getOpenSlots() and book()', () => {
  const sim = createSchedulingSim({ hours: { start: 8, end: 17 }, slotMinutes: 120, daysAhead: 2, busy: [] });
  assert.equal(typeof sim.getOpenSlots, 'function');
  assert.equal(typeof sim.book, 'function');
});

// tests/messaging.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMessagingSim } from '../src/adapters/messaging/simulation.js';

test('send records to transcript and returns an id', () => {
  const msg = createMessagingSim({ silent: true });
  const res = msg.send('+16305551234', 'Hello');
  assert.ok(res.id);
  assert.equal(msg.transcript.length, 1);
  assert.equal(msg.transcript[0].to, '+16305551234');
  assert.equal(msg.transcript[0].body, 'Hello');
});

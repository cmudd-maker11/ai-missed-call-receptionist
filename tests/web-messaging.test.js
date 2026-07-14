// tests/web-messaging.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWebMessaging } from '../web/adapters/web-messaging.js';

test('send enqueues per recipient and satisfies the send contract', () => {
  const m = createWebMessaging();
  const res = m.send('+15550000001', 'Hi there');
  assert.ok(res.id);
  m.send('+15550000001', 'second');
  m.send('+15550000002', 'other person');
  assert.deepEqual(m.drain('+15550000001'), ['Hi there', 'second']);
  assert.deepEqual(m.drain('+15550000002'), ['other person']);
});

test('drain clears the queue', () => {
  const m = createWebMessaging();
  m.send('+15550000001', 'once');
  assert.deepEqual(m.drain('+15550000001'), ['once']);
  assert.deepEqual(m.drain('+15550000001'), []); // emptied
});

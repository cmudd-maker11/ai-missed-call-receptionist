// tests/stateMachine.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/brain/stateMachine.js';

test('GREET always moves to QUALIFY with greet intent', () => {
  const r = decide({ state: 'GREET', fields: {}, served: true });
  assert.deepEqual(r, { state: 'QUALIFY', intent: 'greet' });
});

test('force escalate wins from any active state', () => {
  const r = decide({ state: 'QUALIFY', fields: {}, served: true, forceEscalate: true });
  assert.equal(r.state, 'ESCALATED');
  assert.equal(r.intent, 'escalate');
});

test('QUALIFY with missing fields asks again', () => {
  const r = decide({ state: 'QUALIFY', fields: { service_type: 'heating', urgency: 'emergency', zip: null }, served: true });
  assert.deepEqual(r, { state: 'QUALIFY', intent: 'ask_qualify' });
});

test('QUALIFY complete but out of area escalates', () => {
  const r = decide({ state: 'QUALIFY', fields: { service_type: 'heating', urgency: 'emergency', zip: '99999' }, served: false });
  assert.deepEqual(r, { state: 'ESCALATED', intent: 'escalate' });
});

test('QUALIFY complete and served offers slots and moves to CONFIRM', () => {
  const r = decide({ state: 'QUALIFY', fields: { service_type: 'heating', urgency: 'emergency', zip: '60187' }, served: true });
  assert.deepEqual(r, { state: 'CONFIRM', intent: 'offer_slots' });
});

test('CONFIRM with a chosen slot books', () => {
  const r = decide({ state: 'CONFIRM', fields: {}, served: true, chosenSlot: { start: 'x' } });
  assert.deepEqual(r, { state: 'BOOKED', intent: 'booked' });
});

test('CONFIRM with no chosen slot re-confirms', () => {
  const r = decide({ state: 'CONFIRM', fields: {}, served: true, chosenSlot: null });
  assert.deepEqual(r, { state: 'CONFIRM', intent: 'confirm_booking' });
});

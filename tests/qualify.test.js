// tests/qualify.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFieldsFallback, mergeFields, missingFields, checkServiceArea, normalizeFields, resolveFields } from '../src/brain/qualify.js';

test('normalizeFields drops junk the model might return', () => {
  const services = ['heating', 'cooling', 'water heater', 'thermostat'];
  assert.deepEqual(
    normalizeFields({ service_type: 'HVAC repair', urgency: 'kinda urgent', zip: '6018' }, services),
    { service_type: null, urgency: null, zip: null }
  );
  assert.deepEqual(
    normalizeFields({ service_type: 'Cooling', urgency: 'Emergency', zip: 60187 }, services),
    { service_type: 'cooling', urgency: 'emergency', zip: '60187' }
  );
});

test('resolveFields in mock mode returns the regex result', async () => {
  const brain = { isMock: true };
  const out = await resolveFields({ brain, text: 'no heat, furnace dead, 60187', services: ['heating'] });
  assert.equal(out.service_type, 'heating');
  assert.equal(out.urgency, 'emergency');
  assert.equal(out.zip, '60187');
});

test('resolveFields lets Claude lead and regex backfill', async () => {
  // Claude gets service + urgency; regex catches the ZIP Claude "missed".
  const brain = { isMock: false, extractJSON: async () => ({ service_type: 'cooling', urgency: 'routine', zip: null }) };
  const out = await resolveFields({ brain, text: 'AC tune-up sometime, I am at 60189', services: ['cooling'] });
  assert.equal(out.service_type, 'cooling');
  assert.equal(out.urgency, 'routine');
  assert.equal(out.zip, '60189'); // backfilled by the regex fallback
});

test('resolveFields falls back to regex if Claude throws', async () => {
  const brain = { isMock: false, extractJSON: async () => { throw new Error('api down'); } };
  const out = await resolveFields({ brain, text: 'furnace broken no heat 60187', services: ['heating'] });
  assert.equal(out.service_type, 'heating');
  assert.equal(out.zip, '60187');
});

test('fallback extractor pulls service_type, urgency, zip', () => {
  const f = extractFieldsFallback("my furnace stopped and there's no heat, I'm at 60187");
  assert.equal(f.service_type, 'heating');
  assert.equal(f.urgency, 'emergency');
  assert.equal(f.zip, '60187');
});

test('routine detection', () => {
  const f = extractFieldsFallback('just want a maintenance tune-up on my AC sometime');
  assert.equal(f.service_type, 'cooling');
  assert.equal(f.urgency, 'routine');
});

test('mergeFields keeps existing non-null values', () => {
  const merged = mergeFields({ service_type: 'heating', urgency: null, zip: null }, { urgency: 'emergency', zip: '60187' });
  assert.deepEqual(merged, { service_type: 'heating', urgency: 'emergency', zip: '60187' });
});

test('missingFields lists still-empty required fields', () => {
  assert.deepEqual(missingFields({ service_type: 'heating', urgency: 'emergency', zip: null }), ['zip']);
  assert.deepEqual(missingFields({ service_type: 'heating', urgency: 'emergency', zip: '60187' }), []);
});

test('water heater is not misclassified as heating', () => {
  assert.equal(extractFieldsFallback('my water heater').service_type, 'water heater');
  assert.equal(extractFieldsFallback('my water heater is busted.').service_type, 'water heater');
});

test('checkServiceArea', () => {
  assert.equal(checkServiceArea('60187', ['60187', '60189']), true);
  assert.equal(checkServiceArea('99999', ['60187', '60189']), false);
});

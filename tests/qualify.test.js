// tests/qualify.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFieldsFallback, mergeFields, missingFields, checkServiceArea } from '../src/brain/qualify.js';

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

test('checkServiceArea', () => {
  assert.equal(checkServiceArea('60187', ['60187', '60189']), true);
  assert.equal(checkServiceArea('99999', ['60187', '60189']), false);
});

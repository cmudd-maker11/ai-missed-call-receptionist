// tests/config.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('loadConfig returns business + model + isMock', () => {
  const cfg = loadConfig();
  assert.equal(cfg.business.name, 'Comfort Pros Heating & Air');
  assert.ok(Array.isArray(cfg.business.servedZips));
  assert.equal(typeof cfg.model, 'string');
  assert.equal(typeof cfg.isMock, 'boolean');
});

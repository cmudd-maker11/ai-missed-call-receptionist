// tests/escalation.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldEscalate } from '../src/brain/escalation.js';

test('escalates on anger, legal, and human-request phrases', () => {
  assert.equal(shouldEscalate('this is unacceptable and ridiculous'), true);
  assert.equal(shouldEscalate('I want to talk to a human'), true);
  assert.equal(shouldEscalate('I will sue you, lawsuit incoming'), true);
  assert.equal(shouldEscalate('let me speak to a real person'), true);
});

test('does not escalate on normal service talk', () => {
  assert.equal(shouldEscalate('my furnace is not working, no heat'), false);
  assert.equal(shouldEscalate('can you come out tomorrow?'), false);
});

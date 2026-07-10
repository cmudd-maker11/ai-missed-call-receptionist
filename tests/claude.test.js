// tests/claude.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBrain } from '../src/brain/claude.js';

test('mock brain returns the fallback text', async () => {
  const brain = createBrain({ apiKey: '', model: 'x' });
  const text = await brain.generateText({ system: 's', messages: [], fallback: 'Hello there' });
  assert.equal(text, 'Hello there');
});

test('mock brain extractJSON returns empty object', async () => {
  const brain = createBrain({ apiKey: '', model: 'x' });
  const obj = await brain.extractJSON({ system: 's', prompt: 'p' });
  assert.deepEqual(obj, {});
});

test('brain reports isMock when no key', () => {
  assert.equal(createBrain({ apiKey: '' }).isMock, true);
  assert.equal(createBrain({ apiKey: 'sk-abc' }).isMock, false);
});

// src/brain/claude.js
import Anthropic from '@anthropic-ai/sdk';

const log = (level, msg) =>
  console.log(`[${new Date().toISOString()}] [${level}] [claude] ${msg}`);

export function createBrain({ apiKey, model = 'claude-haiku-4-5-20251001' }) {
  const isMock = !apiKey;
  const client = isMock ? null : new Anthropic({ apiKey });

  return {
    isMock,
    async generateText({ system, messages, fallback, maxTokens = 120 }) {
      if (isMock) return fallback;
      try {
        const res = await client.messages.create({ model, max_tokens: maxTokens, system, messages });
        return res.content[0].text.trim();
      } catch (err) {
        log('ERROR', `generateText failed: ${err.message}`);
        return fallback;
      }
    },
    async extractJSON({ system, prompt, maxTokens = 200 }) {
      if (isMock) return {};
      try {
        const res = await client.messages.create({
          model, max_tokens: maxTokens, system,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = res.content[0].text.trim();
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : {};
      } catch (err) {
        log('ERROR', `extractJSON failed: ${err.message}`);
        return {};
      }
    },
  };
}

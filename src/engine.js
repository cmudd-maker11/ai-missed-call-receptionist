// src/engine.js
import { decide } from './brain/stateMachine.js';
import { shouldEscalate } from './brain/escalation.js';
import { resolveFields, mergeFields, missingFields, checkServiceArea } from './brain/qualify.js';

const log = (level, msg) =>
  console.log(`[${new Date().toISOString()}] [${level}] [engine] ${msg}`);

export class ConversationEngine {
  constructor({ business, db, messaging, scheduling, brain, now }) {
    this.business = business;
    this.db = db;
    this.messaging = messaging;
    this.scheduling = scheduling;
    this.brain = brain;
    this.now = now || (() => new Date());
    this.offered = new Map(); // leadId -> [slots]
  }

  async #say(lead, body, state) {
    this.messaging.send(lead.phone, body);
    this.db.addMessage({ leadId: lead.id, direction: 'outbound', message: body, state });
  }

  async startCall({ phone }) {
    const leadId = this.db.createLead({ phone, source: 'missed_call' });
    const lead = this.db.getLead(leadId);
    const greeting = await this.brain.generateText({
      system: this.#system(),
      messages: [{ role: 'user', content: 'A caller just tried to reach us and we missed it. Greet them warmly in one or two sentences and ask what they need help with. Under 160 characters.' }],
      fallback: `Hi, this is ${this.business.name} — sorry we missed your call! What can we help you with?`,
    });
    await this.#say(lead, greeting, 'GREET');
    this.db.setLeadFields(leadId, { state: 'QUALIFY', status: 'qualifying' });
    return { leadId };
  }

  async handleMessage({ leadId, text }) {
    text = String(text ?? '');
    const lead = this.db.getLead(leadId);
    if (!lead || lead.state === 'BOOKED' || lead.state === 'ESCALATED') return;
    this.db.addMessage({ leadId, direction: 'inbound', message: text, state: lead.state });

    // 1. extract + merge fields (Claude leads when a key is present; regex backfills)
    const extracted = await resolveFields({ brain: this.brain, text, services: this.business.services });
    const merged = mergeFields(
      { service_type: lead.service_type, urgency: lead.urgency, zip: lead.zip },
      extracted
    );
    this.db.setLeadFields(leadId, merged);

    // 2. build context for the state machine
    const served = merged.zip ? checkServiceArea(merged.zip, this.business.servedZips) : true;
    const forceEscalate = shouldEscalate(text);
    const chosenSlot = lead.state === 'CONFIRM' ? this.#parseSlotChoice(leadId, text) : null;

    const { state, intent } = decide({ state: lead.state, fields: merged, served, forceEscalate, chosenSlot });

    // 3. act on intent
    const fresh = this.db.getLead(leadId);
    if (intent === 'escalate') {
      await this.#say(fresh, `I'm going to have someone from ${this.business.name} reach out to you directly. Thanks for your patience.`, 'ESCALATED');
      this.db.setLeadFields(leadId, { state: 'ESCALATED', status: 'escalated' });
      this.offered.delete(leadId);
      log('INFO', `Lead ${leadId} escalated`);
      return;
    }
    if (intent === 'ask_qualify') {
      const need = missingFields(merged);
      const body = await this.brain.generateText({
        system: this.#system(),
        messages: this.#history(leadId),
        fallback: this.#askFallback(need),
      });
      await this.#say(fresh, body, 'QUALIFY');
      return;
    }
    if (intent === 'offer_slots') {
      const slots = this.scheduling.getOpenSlots({ from: this.now(), urgency: merged.urgency });
      this.offered.set(leadId, slots);
      const list = slots.map((s, i) => `${i + 1}) ${s.label}`).join('\n');
      await this.#say(fresh, `Got it — ${merged.urgency === 'emergency' ? 'let’s get you seen fast' : 'happy to help'}. Here are the next openings:\n${list}\nWhich works best?`, 'CONFIRM');
      this.db.setLeadFields(leadId, { state: 'CONFIRM' });
      return;
    }
    if (intent === 'confirm_booking') {
      const slots = this.offered.get(leadId) || [];
      const list = slots.map((s, i) => `${i + 1}) ${s.label}`).join('\n');
      await this.#say(fresh, `No problem — just reply with the number that works:\n${list}`, 'CONFIRM');
      return;
    }
    if (intent === 'booked') {
      const booking = this.scheduling.book({ slot: chosenSlot, lead: fresh });
      this.db.createBooking({ leadId, slotStart: booking.start, slotEnd: booking.end, serviceType: merged.service_type });
      await this.#say(fresh, `You're booked for ${chosenSlot.label}. We'll text a reminder. Thanks for choosing ${this.business.name}!`, 'BOOKED');
      this.db.setLeadFields(leadId, { state: 'BOOKED', status: 'booked' });
      this.offered.delete(leadId);
      log('INFO', `Lead ${leadId} booked ${chosenSlot.start}`);
      return;
    }
  }

  #parseSlotChoice(leadId, text) {
    const slots = this.offered.get(leadId) || [];
    if (!slots.length) return null;
    const lower = text.toLowerCase();
    // Check higher ordinals first so "not the first, the second" resolves to slot 2.
    // Note: free-form time parsing ("the 10am one") is intentionally out of scope for v1.
    if (/\bthird\b|\b3\b|option 3|number 3/.test(lower)) return slots[2] || null;
    if (/\bsecond\b|\b2\b|option 2|number 2/.test(lower)) return slots[1] || null;
    if (/\bfirst\b|\b1\b|option 1|number 1|the one/.test(lower)) return slots[0];
    // match by day word in a label
    for (const s of slots) {
      const day = s.label.slice(0, 3).toLowerCase();
      if (lower.includes(day)) return s;
    }
    return null;
  }

  #askFallback(need) {
    if (need.includes('service_type')) return 'Happy to help! What’s going on — heating, cooling, water heater, or something else?';
    if (need.includes('zip')) return 'Got it. What’s the address or ZIP code so I can check we cover your area?';
    if (need.includes('urgency')) return 'Is this an emergency (no heat/no cooling right now) or more of a routine visit?';
    return 'Can you tell me a bit more so I can get you scheduled?';
  }

  #history(leadId) {
    return this.db.getMessages(leadId).map((m) => ({
      role: m.direction === 'outbound' ? 'assistant' : 'user',
      content: m.message,
    }));
  }

  #system() {
    return `You are the after-hours assistant for ${this.business.name}, a home-service company. ${this.business.tone} Reply by SMS: 1-2 sentences, under 160 characters. Never invent pricing, availability, or timelines.`;
  }
}

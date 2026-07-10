// src/brain/stateMachine.js
// Pure decision function. No side effects.
// ctx: { state, fields:{service_type,urgency,zip}, served:boolean, forceEscalate?:boolean, chosenSlot?:object|null }
const REQUIRED = ['service_type', 'urgency', 'zip'];

export function decide(ctx) {
  const { state, fields = {}, served, forceEscalate, chosenSlot } = ctx;

  if (forceEscalate && state !== 'BOOKED') return { state: 'ESCALATED', intent: 'escalate' };

  switch (state) {
    case 'GREET':
      return { state: 'QUALIFY', intent: 'greet' };
    case 'QUALIFY': {
      const missing = REQUIRED.filter((k) => !fields[k]);
      if (missing.length) return { state: 'QUALIFY', intent: 'ask_qualify' };
      if (!served) return { state: 'ESCALATED', intent: 'escalate' };
      return { state: 'CONFIRM', intent: 'offer_slots' };
    }
    case 'CONFIRM':
      if (chosenSlot) return { state: 'BOOKED', intent: 'booked' };
      return { state: 'CONFIRM', intent: 'confirm_booking' };
    default:
      return { state, intent: 'noop' };
  }
}

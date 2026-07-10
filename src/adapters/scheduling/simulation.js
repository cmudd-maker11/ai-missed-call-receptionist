// src/adapters/scheduling/simulation.js
// SchedulingAdapter (simulation). Interface:
//   getOpenSlots({ from, urgency }) -> [{ start, end, label }]
//   book({ slot, lead }) -> { bookingId, start, end }
import { randomUUID } from 'node:crypto';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(d) {
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${mm}${ampm}`;
}
function label(start, end) {
  return `${DAY[start.getDay()]} ${MON[start.getMonth()]} ${start.getDate()}, ${fmt(start)}–${fmt(end)}`;
}
function iso(d) {
  // local ISO without timezone shifting
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export function createSchedulingSim(config) {
  const taken = new Set([...(config.busy || [])]);

  function allSlots(from) {
    const out = [];
    const base = new Date(from);
    for (let day = 0; day <= config.daysAhead; day++) {
      for (let h = config.hours.start; h + config.slotMinutes / 60 <= config.hours.end; h += config.slotMinutes / 60) {
        const start = new Date(base);
        start.setDate(base.getDate() + day);
        start.setHours(h, 0, 0, 0);
        if (start <= from) continue;
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + config.slotMinutes);
        const startIso = iso(start);
        if (taken.has(startIso)) continue;
        out.push({ start: startIso, end: iso(end), label: label(start, end) });
      }
    }
    return out;
  }

  return {
    getOpenSlots({ from, urgency }) {
      const slots = allSlots(from || new Date());
      // emergency callers get the soonest few; routine gets a spread
      return slots.slice(0, 3);
    },
    book({ slot, lead }) {
      taken.add(slot.start);
      return { bookingId: randomUUID(), start: slot.start, end: slot.end };
    },
  };
}

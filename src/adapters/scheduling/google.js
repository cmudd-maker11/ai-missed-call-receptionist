// src/adapters/scheduling/google.js
// Real SchedulingAdapter. NOT required to run the demo or tests.
// To enable: wire the Google Calendar API (freebusy.query for getOpenSlots,
// events.insert for book). Interface matches simulation:
//   getOpenSlots({ from, urgency }) -> [{ start, end, label }]
//   book({ slot, lead }) -> { bookingId, start, end }
export function createSchedulingGoogle() {
  throw new Error('Google Calendar adapter is a documented stub. See source comments to enable.');
}

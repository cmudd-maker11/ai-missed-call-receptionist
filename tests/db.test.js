// tests/db.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';

test('db creates and reads lead, conversation, booking', () => {
  const db = openDb(':memory:');
  const leadId = db.createLead({ phone: '+16305551234', source: 'missed_call' });
  assert.ok(leadId);

  db.setLeadFields(leadId, { service_type: 'heating', urgency: 'emergency', zip: '60187', status: 'qualifying' });
  const lead = db.getLead(leadId);
  assert.equal(lead.service_type, 'heating');
  assert.equal(lead.status, 'qualifying');

  db.addMessage({ leadId, direction: 'outbound', message: 'Hi!', state: 'GREET' });
  db.addMessage({ leadId, direction: 'inbound', message: 'No heat', state: 'QUALIFY' });
  const history = db.getMessages(leadId);
  assert.equal(history.length, 2);
  assert.equal(history[0].direction, 'outbound');

  const bookingId = db.createBooking({
    leadId, slotStart: '2026-07-11T08:00:00', slotEnd: '2026-07-11T10:00:00', serviceType: 'heating',
  });
  assert.ok(bookingId);
  const booking = db.getBookingByLead(leadId);
  assert.equal(booking.status, 'confirmed');
});

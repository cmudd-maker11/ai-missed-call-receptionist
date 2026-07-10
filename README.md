# AI Missed-Call Receptionist

Texts back missed callers, qualifies the job, and books the appointment.

## The problem

- Home services has the highest phone-to-sale conversion rate of any industry, about 46%. (supplyht.com)
- Only about 61% of callers reach a human. Roughly 4 in 10 inbound calls never connect. (supplyht.com)
- Home-service shops miss about 27% of inbound calls. After-hours calls are 35 to 45% of volume and get answered less than 18% of the time. Fewer than 3% of people who hit voicemail leave a message. (Invoca, Housecall Pro, Higrovi, as reported)
- Market proof: Avoca raised to a roughly $1B valuation doing this for the trades in 2026. (Fortune)

Note: the 46% conversion figure and the 61% reach-a-human figure were independently fact-checked. The rest are cited as reported by their original sources.

Every missed call is a lead that a competitor picks up first. This project is a simulation-first prototype of the fix: text the caller back within seconds, ask what they need, check if you cover their area, offer real open slots, and book it, all before a human ever has to call back.

## Demo

![demo](docs/demo.gif)

```bash
npm run demo
```

## Try it yourself

```bash
npm install
npm run demo   # scripted: watch the AI take a caller from missed call to booked
npm run chat   # interactive: you play the caller
```

Runs with no API key in mock mode (deterministic canned replies), so tests and demos work out of the box. Add `ANTHROPIC_API_KEY` in a `.env` file (see `.env.example`) for live Claude responses.

## How it works

A single conversation engine drives an explicit state machine. Claude phrases each outbound message and helps extract structured fields (service type, urgency, ZIP), with a deterministic keyword fallback so the whole thing still works with no API key.

```
GREET ──► QUALIFY ──(fields complete, offer open slots)──► CONFIRM ──► BOOKED
             │
             ▼ (angry caller, out of service area, asks for a human)
         ESCALATED
```

These are the states actually persisted on the lead (GREET, QUALIFY, CONFIRM, BOOKED, ESCALATED). Offering slots is not its own state, it is the action the engine takes on the QUALIFY-to-CONFIRM transition.

Two adapters keep the engine honest about what's real and what's simulated:

- **MessagingAdapter**: sends the texts. Simulation records the transcript in memory; nothing leaves the process.
- **SchedulingAdapter**: offers and books slots. Simulation uses a fake calendar built from `business.config.json`.

Everything else (the state machine, escalation net, field extraction) is pure logic with no side effects, which is what makes it fast and easy to test without mocking a network.

## Architecture / extending it

The engine only depends on adapter interfaces, not implementations, so swapping in real services means writing a new adapter with the same shape and passing it in at the entry point:

- `src/adapters/messaging/twilio.js` is a documented stub for real SMS sending. It throws until you fill in the commented-out Twilio client code and set `TWILIO_*` env vars.
- `src/adapters/scheduling/google.js` is a documented stub for a real calendar. It throws until you wire up the Google Calendar API for `getOpenSlots` and `book`.

Live voice is a planned upgrade through Vapi, layered on top of this same engine. Claude stays the brain either way; Vapi would just replace SMS as the channel that carries the conversation.

`src/config.js` already prepares a persistent SQLite path (`data/receptionist.db`), but the current `demo` and `chat` CLIs both open the database in-memory (`:memory:`). Persistent storage is wired but not yet used, it is waiting on a future entry point.

## Running the tests

```bash
npm test
```

27 tests cover the state machine transitions, field extraction, service-area checks, scheduling and messaging adapters, the escalation net, the adapter contracts, and a full integration path from missed call to booked appointment.

## Limitations & what's next

- No real voice yet. This is text-back only; voice is a planned Vapi layer.
- The calendar is simulated. Real bookings need the Google adapter wired up.
- Single business, configured in `business.config.json`. Not multi-tenant.
- Mock mode uses templated replies. Real Claude output reads more naturally than the mock transcript suggests.
- Real SMS sending would require a TCPA/consent review before contacting real phone numbers.

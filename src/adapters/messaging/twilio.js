// src/adapters/messaging/twilio.js
// Real MessagingAdapter. NOT required to run the demo or tests.
// To enable: `npm i twilio`, set TWILIO_* env vars, and swap this in for the
// simulation adapter in your entry point. Interface matches simulation: send(to, body) -> { id }.
//
// import twilio from 'twilio';
//
// export function createMessagingTwilio({ accountSid, authToken, from }) {
//   const client = twilio(accountSid, authToken);
//   return {
//     async send(to, body) {
//       const msg = await client.messages.create({ to, from, body });
//       return { id: msg.sid };
//     },
//   };
// }
export function createMessagingTwilio() {
  throw new Error('Twilio adapter is a documented stub. See source comments to enable.');
}

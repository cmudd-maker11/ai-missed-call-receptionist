// web/adapters/web-messaging.js
// MessagingAdapter for the web demo. Same contract as the sim adapter: send(to, body) -> { id }.
// It captures each outbound message into a per-recipient outbox the server drains after
// an engine call, so the browser gets exactly the replies for its own session.
export function createWebMessaging() {
  const outbox = new Map(); // phone -> [body, ...]
  return {
    send(to, body) {
      if (!outbox.has(to)) outbox.set(to, []);
      const q = outbox.get(to);
      q.push(body);
      return { id: `web-${to}-${q.length}` };
    },
    drain(to) {
      const msgs = outbox.get(to) || [];
      outbox.set(to, []);
      return msgs.slice();
    },
  };
}

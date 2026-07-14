// web/public/app.js
const thread = document.getElementById('thread');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const banner = document.getElementById('banner');

let sessionId = null;
let ended = false;

function bubble(text, who) {
  const div = document.createElement('div');
  div.className = 'msg ' + who;
  div.textContent = text;
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
  return div;
}

function showTyping() {
  const t = document.createElement('div');
  t.className = 'typing';
  t.innerHTML = '<span></span><span></span><span></span>';
  thread.appendChild(t);
  thread.scrollTop = thread.scrollHeight;
  return t;
}

function endWith(state) {
  ended = true;
  input.disabled = true; sendBtn.disabled = true;
  const ok = state === 'BOOKED';
  banner.className = 'banner ' + (ok ? 'ok' : 'amber');
  banner.textContent = ok ? 'Appointment booked ✓' : 'Handed off to a person';
  const again = document.createElement('button');
  again.textContent = 'Start over';
  again.onclick = () => location.reload();
  banner.appendChild(again);
  banner.hidden = false;
}

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return res.json();
}

async function start() {
  const data = await post('/api/start', {});
  sessionId = data.sessionId;
  (data.replies || []).forEach((r) => bubble(r, 'ai'));
  if (data.done) endWith(data.state);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || ended || !sessionId) return;
  bubble(text, 'me');
  input.value = '';
  const typing = showTyping();
  try {
    const data = await post('/api/message', { sessionId, text });
    typing.remove();
    (data.replies || []).forEach((r) => bubble(r, 'ai'));
    if (data.done) endWith(data.state);
  } catch {
    typing.remove();
    bubble('Connection hiccup. Refresh to start over.', 'ai');
  }
});

start();

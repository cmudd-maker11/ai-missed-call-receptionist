# Deploying the live web demo (Railway)

The web demo is a single Node service. Railway is the simplest host.

1. Push this repo to GitHub (already done).
2. On railway.app, create a new project - Deploy from GitHub repo - pick this repo.
3. Railway auto-detects Node and runs `npm run serve` (via the `Procfile`).
4. Add an environment variable: `ANTHROPIC_API_KEY = <your key>`. Without it, the site runs in mock mode.
5. Deploy. Railway gives you a public URL like `https://your-app.up.railway.app`.
6. Put that URL in the README's "Try it live" line and on your portfolio site.

Cost: the app uses the cheap haiku model and a daily cap on conversation turns, so a normal month is a few dollars. Note that one counted turn can make up to two Claude calls (field extraction plus the reply), so the real call volume runs a bit above the turn count, still small in dollars on haiku. The daily cap makes worst-case spend bounded: once it is hit, the demo stops calling the API until the next day. A per-IP daily cap keeps a single visitor from draining the whole budget, and `trust proxy` is enabled so the per-IP limits use the real client address behind Railway's proxy.

Notes:
- The API key lives only as a Railway environment variable. It is never in the repo and never sent to the browser.
- State is in-memory and resets on each deploy. That is intentional for a demo.

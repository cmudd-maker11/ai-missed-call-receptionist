# Deploying the live web demo (Railway)

The web demo is a single Node service. Railway is the simplest host.

1. Push this repo to GitHub (already done).
2. On railway.app, create a new project - Deploy from GitHub repo - pick this repo.
3. Railway auto-detects Node and runs `npm run serve` (via the `Procfile`).
4. Add an environment variable: `ANTHROPIC_API_KEY = <your key>`. Without it, the site runs in mock mode.
5. Deploy. Railway gives you a public URL like `https://your-app.up.railway.app`.
6. Put that URL in the README's "Try it live" line and on your portfolio site.

Cost: the app uses the cheap haiku model and a daily message cap, so a normal month is a few dollars. The daily cap makes worst-case spend bounded - once it is hit, the demo stops calling the API until the next day.

Notes:
- The API key lives only as a Railway environment variable. It is never in the repo and never sent to the browser.
- State is in-memory and resets on each deploy. That is intentional for a demo.

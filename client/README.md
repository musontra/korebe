# Antigravity — Client

Astro + Tailwind + TypeScript. The game screen is a plain HTML Canvas 2D that renders the
authoritative snapshots streamed from the server. The client has ZERO physics — it only sends
input (movement / shoot) and draws what the server reports.

## Run locally

```bash
npm install
npm run dev          # http://localhost:4321 (or the next free port)
```

No `.env` is required for local dev: `src/game/net.ts` falls back to `ws://localhost:8080`,
so just run the server (see `../server/README.md`) alongside `npm run dev`.

## Configuration

- `PUBLIC_SERVER_URL` — WebSocket URL of the game server. Optional locally (falls back to
  `ws://localhost:8080`). See [`.env.example`](.env.example).

## Deploy (Cloudflare Pages) — NOT DONE YET

1. Cloudflare Pages → Create → connect this repo.
2. Build settings:
   - **Root directory:** `client`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Environment variable:
   - `PUBLIC_SERVER_URL = wss://<your-render-service>.onrender.com`
     (must be `wss://` — the page is HTTPS, so plain `ws://` is blocked as mixed content).
4. Redeploy after setting the env var so the build inlines it.

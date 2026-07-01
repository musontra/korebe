# Antigravity — Server

Authoritative Node.js + `ws` WebSocket game server. One match = one room, joined by code.
All physics/collision/bullet/elimination run here; clients only send input and render snapshots.

## Run locally

```bash
npm install
npm start            # listens on ws://localhost:8080
DEBUG=1 npm start    # also prints high-volume logs (phase transitions, each bullet bounce)
```

- `PORT` env overrides the port (default 8080). Render sets this automatically.
- `DEBUG` env toggles verbose per-tick logs. Without it, only match milestones log
  (room create/join/disconnect, round start, shoot, hit, game end).

## Deploy (Render) — NOT DONE YET

Config lives in the repo-root [`render.yaml`](../render.yaml) (infrastructure-as-code).

1. New → Blueprint on Render, point at this repo; it picks up `render.yaml`.
2. The service uses `rootDir: server`, `npm install`, `npm start`. Render injects `PORT`.
3. After deploy, the public URL is `wss://<service-name>.onrender.com` — put that into the
   client's `PUBLIC_SERVER_URL` (Cloudflare Pages env), NOT `ws://`.

### Caveat: WebSocket-only health check
This server has no plain HTTP route, so Render's default health check on `/` may report the
service unhealthy. If that happens, disable the health check in the Render dashboard or add a
minimal HTTP 200 handler. Deferred until the actual deploy step.

### Free-plan note
Render free web services sleep after inactivity and cold-start on the next connection (a few
seconds). Fine for playtesting; revisit if it hurts.

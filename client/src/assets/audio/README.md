# Audio assets

Drop sound files here and they play automatically — no code changes needed.
`src/game/audio.ts` discovers them with `import.meta.glob`, so ONLY files that exist are loaded
(a missing sound is never fetched → no 404 in the console). Vite/HMR picks up new files on save.

The **basename** (filename without extension) is the sound's name. Supported: `.mp3`, `.ogg`, `.wav`.

Expected names:

| File | When it plays |
|------|---------------|
| `shot.*` | blind player fires (bullet appears) |
| `hit.*` | a player is eliminated (put your own "ugh" here; keep the name) |
| `step.*` | blind-only footstep, in sync with the sound ripple (audio throttled by `STEP_MIN_INTERVAL_MS`) |
| `ui.*` | button clicks (join / rematch / unmute) |
| `standoff.*` | cowboy-standoff music loop during ShootingPhase |

Keep SFX small (< ~300 KB) and the music loop reasonable (< ~2 MB); everything is preloaded.
Sources used: Pixabay (Content License, no attribution) and Kenney (CC0).

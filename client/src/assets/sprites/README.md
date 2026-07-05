# Character sprite assets

Drop sprite images here and they render automatically — no code changes needed.
`src/game/sprites.ts` discovers them with `import.meta.glob`, so ONLY files that exist are loaded
(a missing sprite is never fetched → the plain-color circle is drawn instead, no 404). Vite/HMR
picks up new files on save.

The **basename** (filename without extension) is the player id it maps to. Supported: `.png`, `.webp`.

Expected names:

| File | Maps to |
|------|---------|
| `P1.*` | player 1 (matches `PLAYER_COLORS.P1`, red) |
| `P2.*` | player 2 (matches `PLAYER_COLORS.P2`, green) |
| `P3.*` | player 3 (matches `PLAYER_COLORS.P3`, blue) |
| `P1_blind.*` | player 1 while they are the blind player (körebe) this round — optional |
| `P2_blind.*` | player 2 while blind — optional |
| `P3_blind.*` | player 3 while blind — optional |

The `_blind` variant is drawn instead of the base sprite whenever `isBlind` is true for that
player (e.g. a version holding a gun). If it doesn't exist, the base sprite is used and the
white ring (drawn separately by `renderer.ts`) remains the only blind indicator.

Requirements:

- Square canvas, transparent background, single top-down angle (no directional variants — the
  server sends no facing/rotation, and the client draws no rotation; see CLAUDE.md).
- Source resolution 128x128 or 256x256. On-screen draw size is ~36x36px (`PLAYER_RADIUS=25` world
  units x 0.72 scale), so anything sharper than that is wasted detail.
- Static art only — no animation frames (that's package G).

The blind-player white ring and the dead-player fade (`globalAlpha=0.35`) are drawn by
`renderer.ts` on top of/under the sprite regardless of whether a sprite exists, so they don't need
to be baked into the image.

// Static character sprites for renderer.ts. ASSET-AGNOSTIC BY DESIGN, same pattern as audio.ts:
// sprites are discovered with import.meta.glob, which resolves ONLY files that exist at build
// time. Drop P1.png / P2.png / P3.png (plus optional P1_blind.png etc.) into src/assets/sprites/
// and they're picked up automatically; until then (or for any missing id) getSprite returns null
// and the caller falls back to the plain-circle drawing. No animation, no rotation — that's
// package G.
const ASSET_MODULES = import.meta.glob("/src/assets/sprites/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const images: Record<string, HTMLImageElement> = {}; // only present once a file has loaded OK

for (const [path, url] of Object.entries(ASSET_MODULES)) {
  const base = path.split("/").pop()!.replace(/\.(png|webp)$/, "");
  const img = new Image();
  img.src = url;
  img.onload = () => {
    images[base] = img;
  };
}

// Returns the loaded sprite for a player id, or null if it doesn't exist / hasn't loaded yet
// (caller must fall back to the plain-circle drawing in that case). When blind is true, prefers
// the "<id>_blind" variant (e.g. holding a gun) and falls back to the base sprite if that variant
// doesn't exist.
export function getSprite(id: string, blind = false): HTMLImageElement | null {
  if (blind) {
    const blindImg = images[`${id}_blind`];
    if (blindImg) return blindImg;
  }
  return images[id] ?? null;
}

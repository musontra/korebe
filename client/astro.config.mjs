// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Minimal Astro config. Tailwind v4 is wired in via its Vite plugin.
// The JSDoc cast avoids a duplicate-Vite type mismatch between @tailwindcss/vite
// and the Vite that Astro bundles; it is a types-only issue, harmless at runtime.
export default defineConfig({
  vite: {
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});

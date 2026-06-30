// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Minimal Astro config. Tailwind v4 is wired in via its Vite plugin.
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});

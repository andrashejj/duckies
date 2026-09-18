// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

import { readdirSync } from 'node:fs';
import { site } from './src/data/site';

// The members-only gallery is served from inside the server function (see src/lib/server/gallery-assets.ts).
const galleryFiles = readdirSync('src/assets/gallery', { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(webp|mp4)$/.test(entry.name))
  .map((entry) => `${entry.parentPath}/${entry.name}`);

// https://astro.build/config
export default defineConfig({
  site: site.url,
  adapter: vercel({ includeFiles: ["src/assets/NotoSans-Regular.ttf", "src/assets/NotoSans-LICENSE.txt", ...galleryFiles] }),
  integrations: [react()],
  vite: {
    cacheDir: process.env.DUCKIES_TEST_SERVER ? ".astro/vite-test" : undefined,
    plugins: [tailwindcss()],
  },
});

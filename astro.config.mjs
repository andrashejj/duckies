// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

import { site } from './src/data/site';

// https://astro.build/config
export default defineConfig({
  site: site.url,
  adapter: vercel(),
  integrations: [react()],
  vite: {
    cacheDir: process.env.DUCKIES_TEST_SERVER ? ".astro/vite-test" : undefined,
    plugins: [tailwindcss()],
  },
});

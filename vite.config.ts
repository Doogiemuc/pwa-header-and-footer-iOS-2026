import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build also works from a sub-path (e.g. GitHub Pages).
  base: './',
  plugins: [vue()],
  // Two pages: index.html = "page scrolls", inner.html = "rect scrolls inside".
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        inner: fileURLToPath(new URL('./inner.html', import.meta.url)),
      },
    },
  },
  // Listen on all interfaces and accept any Host header, so a phone can open the server by IP or by
  // an intranet hostname (e.g. my-mac.local, my-mac.fritz.box). Dev/POC only: do not expose to the internet.
  server: { host: true, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
})

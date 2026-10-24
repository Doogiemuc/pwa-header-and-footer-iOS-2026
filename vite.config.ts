import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build also works from a sub-path (e.g. GitHub Pages).
  base: './',
  plugins: [vue()],
  // Listen on all interfaces and accept any Host header, so a phone can open the server by IP or by
  // an intranet hostname (e.g. my-mac.local, my-mac.fritz.box). Dev/POC only: do not expose to the internet.
  server: { host: true, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
})

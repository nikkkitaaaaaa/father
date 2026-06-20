import { defineConfig } from 'vite';

// host: true exposes the dev server on your local network (e.g. 192.168.x.x)
// so you can open the site on your phone while testing the camera/AR flow.
//
// IMPORTANT: getUserMedia() (the camera) only works in a "secure context".
// That means either:
//   - http://localhost on the same machine, OR
//   - https:// anywhere else (including your phone on the same WiFi).
// Plain http://192.168.x.x on a phone will NOT be allowed to access the camera.
// See the README for two easy ways to test on a real phone over HTTPS.
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  }
});

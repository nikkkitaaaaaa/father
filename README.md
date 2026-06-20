# Happy Father's Day — WebAR Experience

A single-page WebAR keepsake: live camera background, a floating 3D avatar
that "stands" in front of you, a voice message with synced typewriter
captions, and a confetti-and-hearts celebration finale.

## 1. Add your two files

Put these in the `public/` folder, with these exact names:

```
public/avatar.glb
public/voice.mp3
```

(The app will still run and show a placeholder capsule figure if you skip
this step — useful for testing the flow before your real files are ready.)

## 2. Install dependencies

```bash
npm install
```

## 3. Run it locally

```bash
npm run dev
```

This opens the app at `http://localhost:5173`. Camera access works here
because `localhost` counts as a "secure context" even over plain HTTP.

## 4. Test it on your actual phone (camera requires HTTPS)

`getUserMedia()` (the camera) is blocked by both Android Chrome and iPhone
Safari unless the page is loaded over **HTTPS**, or from `localhost` on the
same device. Two easy ways to test on a real phone:

**Option A — ngrok (quickest):**
```bash
npm run dev -- --host
npx ngrok http 5173
```
Open the `https://...ngrok-free.app` URL it gives you on your phone.

**Option B — local network with a trusted cert (mkcert):**
```bash
npm install -g mkcert
mkcert -install
mkcert localhost <your-computer's-LAN-IP>
```
Then point Vite's `server.https` option at the generated `.pem` files in
`vite.config.js`, run `npm run dev -- --host`, and open
`https://<your-LAN-IP>:5173` on your phone (same WiFi network).

## 5. Build for production

```bash
npm run build
npm run preview
```

`npm run build` outputs static files to `dist/` — deploy that folder to any
static host with HTTPS (Vercel, Netlify, GitHub Pages, etc.) and the camera
will work there automatically, no extra config needed.

## 6. Deploy to GitHub Pages (recommended for phone testing)

GitHub Pages serves over HTTPS automatically, which solves the camera
requirement from step 4 without ngrok or local certificates.

**One-time setup:**
```bash
git init
git add .
git commit -m "Father's Day WebAR experience"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then on GitHub: open your repo → **Settings → Pages** → under "Build and
deployment", set **Source** to **GitHub Actions**. That's it — the included
workflow at `.github/workflows/deploy.yml` builds the project and publishes
it automatically.

**Every time you push to `main`**, it redeploys:
```bash
git add .
git commit -m "update"
git push
```

Your live URL will be:
```
https://<your-username>.github.io/<your-repo>/
```
Open that link on your phone (any browser) — camera permission will work
immediately since it's HTTPS. Check the **Actions** tab on GitHub if you
want to watch the build/deploy run, or to debug a failed deploy.

> `avatar.glb` and `voice.mp3` are committed as regular files here, which is
> fine for typical sizes. If either file is unusually large (tens of MB+),
> GitHub will warn you — in that case use
> [Git LFS](https://git-lfs.github.com) for that file instead of committing
> it directly.

## Project structure

```
index.html      — page markup: start screen, video, canvas mount, speech
                   bubble, celebration overlay
style.css        — all visual design: palette, layout, animations, responsive rules
main.js          — camera, Three.js scene/avatar, audio sync, typewriter, celebration
vite.config.js   — dev server config (LAN access for phone testing)
package.json     — dependencies + npm scripts
public/          — put avatar.glb and voice.mp3 here
```

## Tuning the avatar's placement

If your avatar looks too big/small or floats at the wrong height once you
drop in the real `avatar.glb`, open `main.js` and adjust the constants at
the top of the file — `AVATAR_CONFIG.targetHeight`, `.distance`, and
`.groundY`. Everything else (scaling, centering, the floating animation)
adapts automatically.

## Notes

- This uses plain camera-passthrough AR (a `<video>` background behind a
  transparent Three.js canvas), not WebXR plane tracking — so the avatar is
  anchored at a fixed point in front of the camera rather than detecting a
  real table. It's the same trick most lightweight "open in browser" AR
  filters use, and it doesn't require any special device support.
- No backend, no analytics, no external services — everything runs
  client-side once the page is loaded.

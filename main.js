// =============================================================================
// FATHER'S DAY WEBAR EXPERIENCE — main.js
// Built with vanilla Three.js (no WebXR) — the camera feed is a fullscreen
// <video> background, and the 3D avatar is rendered in a transparent canvas
// on top of it. This is a classic "video passthrough AR" trick: it doesn't
// track real-world surfaces, it just convincingly places the avatar in a
// fixed spot in front of the camera so it reads as "standing on the table".
// =============================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// -----------------------------------------------------------------------------
// 1. CONFIG — tweak these to match your actual avatar.glb without touching
//    any of the logic below.
// -----------------------------------------------------------------------------
const AVATAR_CONFIG = {
  url: '/avatar.glb',
  targetHeight: 1.1,        // the avatar is auto-scaled to be this "tall" in world units
  distance: -2.4,           // how far in front of the camera it stands (negative = into the screen)
  groundY: -0.55,           // vertical position of the "table surface" the avatar stands on
  floatAmplitude: 0.045,    // how far it gently bobs up and down
  floatSpeed: 1.1,          // bob speed
  rotateSpeed: 0.18         // slow idle spin, radians/sec
};
rotateSpeed: 0
// The voice-over script. Each line is shown in the speech bubble, timed
// proportionally against the real length of voice.mp3 (see runStoryline).
const MESSAGES = [
  'Hello Papa! ❤️',
  "Happy Father's Day.",
  'Thank you for always trusting me, especially when nobody believed in me.',
  'Thank you for all the pampering and unconditional love.',
  'Thank you for supporting my dreams and believing in me.',
  'Whatever I become in life will always be because of your support.',
  'I may not say it often, but I notice every sacrifice and every little thing you do for me.',
  'I love you Papa. ❤️'
];

// Used only if voice.mp3's real duration can't be read (e.g. file missing,
// or a mobile browser reports an unreliable duration). Keeps the demo usable.
const FALLBACK_VOICE_DURATION = 40; // seconds

// -----------------------------------------------------------------------------
// 2. DOM REFERENCES
// -----------------------------------------------------------------------------
const startScreen   = document.getElementById('start-screen');
const startButton   = document.getElementById('start-button');
const startHint     = document.querySelector('.start-hint');
const videoEl       = document.getElementById('camera-feed');
const threeMount    = document.getElementById('three-mount');
const speechBubble  = document.getElementById('speech-bubble');
const speechText    = document.getElementById('speech-text');
const voiceAudio    = document.getElementById('voice-audio');
const celebrationEl = document.getElementById('celebration');
const glowHeartEl   = document.getElementById('glow-heart');
const achievementEl = document.getElementById('achievement-card');
const heartsField   = document.getElementById('hearts-field');
const confettiField = document.getElementById('confetti-field');

// -----------------------------------------------------------------------------
// 3. THREE.JS STATE — populated by initThree()
// -----------------------------------------------------------------------------
let renderer, scene, camera, avatar, clock;

/**
 * Sets up the transparent Three.js scene that floats above the camera feed.
 * Called once, right after the user grants camera access.
 */
function initThree() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap for phone performance
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // fully transparent — the <video> shows through
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  threeMount.appendChild(renderer.domElement);

  // Warm, candlelit lighting to match the visual theme of the experience.
  const ambient = new THREE.AmbientLight(0xfff1d6, 0.9);
  const keyLight = new THREE.DirectionalLight(0xffe2b0, 1.2);
  keyLight.position.set(1.5, 2, 1.5);
  const rimLight = new THREE.DirectionalLight(0xffa6c0, 0.5);
  rimLight.position.set(-2, 1, -1);
  scene.add(ambient, keyLight, rimLight);

  // A soft radial-gradient "contact shadow" so the avatar feels grounded on
  // a surface, rather than floating in empty space.
  scene.add(createGroundShadow());

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('orientationchange', onWindowResize);
}

function onWindowResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/** A simple soft dark ellipse using a generated radial-gradient texture. */
function createGroundShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,0,0,0.45)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const geometry = new THREE.PlaneGeometry(1.1, 1.1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, AVATAR_CONFIG.groundY - 0.01, AVATAR_CONFIG.distance);
  return mesh;
}

/**
 * Loads avatar.glb, auto-scales it to AVATAR_CONFIG.targetHeight regardless
 * of how it was originally modeled/exported, and stands it on the "ground".
 * Falls back to a simple placeholder mesh if the file is missing, so the
 * rest of the experience still demoes correctly.
 */
function loadAvatar() {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(
      AVATAR_CONFIG.url,
     (gltf) => {
    avatarRoot = new THREE.Group();
    avatar = gltf.scene;

    // Fix image→GLB orientation
    avatar.rotation.set(0, 0, Math.PI / 2);

    avatarRoot.add(avatar);

    fitAvatarToStage(avatarRoot);

    scene.add(avatarRoot);

    resolve(avatarRoot);
},
    );
  });
}

/** Auto-scales and positions any model so it reliably stands in frame. */
function fitAvatarToStage(object3D) {
  const box = new THREE.Box3().setFromObject(object3D);
  const size = box.getSize(new THREE.Vector3());

  const currentHeight = size.y || 1;
  const scale = AVATAR_CONFIG.targetHeight / currentHeight;
  object3D.scale.setScalar(scale);

  // Re-measure after scaling, then place so the model's feet sit on groundY
  // and it's horizontally centered at AVATAR_CONFIG.distance.
  const scaledBox = new THREE.Box3().setFromObject(object3D);
  const scaledSize = scaledBox.getSize(new THREE.Vector3());
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

  object3D.position.x += -scaledCenter.x;
  object3D.position.z += AVATAR_CONFIG.distance - scaledCenter.z;
  object3D.position.y += AVATAR_CONFIG.groundY - (scaledCenter.y - scaledSize.y / 2);
}

/** Placeholder so the experience still works before the real avatar.glb is added. */
function createPlaceholderAvatar() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.55, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xe8b35a, roughness: 0.5, metalness: 0.1 })
  );
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xf3d8a0, roughness: 0.4 })
  );
  body.position.y = 0.4;
  head.position.y = 0.85;
  group.add(body, head);
  return group;
}

/**
 * Main render loop — gentle floating + slow rotation on the avatar,
 * runs for the lifetime of the page.
 */
function animate() {
    requestAnimationFrame(animate);

    const t = clock.getElapsedTime();

    if (avatarRoot) {
        avatarRoot.position.y =
            Math.sin(t * AVATAR_CONFIG.floatSpeed) *
            AVATAR_CONFIG.floatAmplitude;

        // Keep facing forward
        avatarRoot.rotation.y = 0;
    }

    renderer.render(scene, camera);
}

// -----------------------------------------------------------------------------
// 4. CAMERA — request permission and stream the live feed into <video>
// -----------------------------------------------------------------------------
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API not supported in this browser.');
  }

  // Prefer the rear ("environment") camera for AR; gracefully fall back
  // to whatever camera is available (useful when testing on a laptop).
  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    // Some desktop browsers reject facingMode constraints entirely — retry plainly.
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }

  videoEl.srcObject = stream;
  await new Promise((resolve) => {
    videoEl.onloadedmetadata = () => {
      videoEl.play().then(resolve).catch(resolve);
    };
  });
}

// -----------------------------------------------------------------------------
// 5. AUDIO UNLOCK — iOS Safari only allows audio.play() to start inside a
//    direct user-gesture call stack. We "warm up" the element synchronously
//    in the button's click handler, before any `await` breaks that chain.
// -----------------------------------------------------------------------------
async function unlockAudio() {
  try {
    voiceAudio.volume = 1;
    await voiceAudio.play();
    voiceAudio.pause();
    voiceAudio.currentTime = 0;
  } catch (err) {
    // Autoplay may still be blocked here — we'll try again right before the
    // story starts, which is close enough to the gesture on most browsers.
    console.warn('[audio] Unlock attempt was blocked, will retry later.', err);
  }
}

/** Resolves with a usable duration in seconds, even if metadata never loads. */
function getAudioDuration() {
  return new Promise((resolve) => {
    if (voiceAudio.readyState >= 1 && isFinite(voiceAudio.duration) && voiceAudio.duration > 0) {
      resolve(voiceAudio.duration);
      return;
    }
    const onLoaded = () => {
      voiceAudio.removeEventListener('loadedmetadata', onLoaded);
      const d = voiceAudio.duration;
      resolve(isFinite(d) && d > 0 ? d : FALLBACK_VOICE_DURATION);
    };
    voiceAudio.addEventListener('loadedmetadata', onLoaded);
    // Don't wait forever if voice.mp3 is missing/broken.
    setTimeout(() => {
      voiceAudio.removeEventListener('loadedmetadata', onLoaded);
      resolve(FALLBACK_VOICE_DURATION);
    }, 1500);
  });
}

// -----------------------------------------------------------------------------
// 6. TYPEWRITER + VOICE SYNC
//    Each message gets a slice of the total voice duration proportional to
//    its character count, so longer lines get more time on screen and the
//    final "I love you Papa" lands close to when the recording ends.
// -----------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeLine(text, charDelayMs) {
  speechText.textContent = '';
  speechBubble.classList.remove('typing-done');
  for (let i = 0; i < text.length; i++) {
    speechText.textContent += text[i];
    await sleep(charDelayMs);
  }
  speechBubble.classList.add('typing-done');
}

async function runStoryline() {
  const totalDuration = await getAudioDuration();
  const totalChars = MESSAGES.reduce((sum, line) => sum + line.length, 0);
  const minLineSeconds = 1.8; // floor so short lines like "Hello Papa! ❤️" aren't instant

  // Try to start the voice recording now, as close to the click as we can.
  voiceAudio.currentTime = 0;
  voiceAudio.play().catch((err) => console.warn('[audio] Playback blocked:', err));

  speechBubble.classList.remove('hidden');

  for (const line of MESSAGES) {
    const share = line.length / totalChars;
    const lineDuration = Math.max(minLineSeconds, totalDuration * share);
    const typeShare = 0.7;   // 70% of the line's time is spent typing
    const holdShare = 0.3;   // 30% is spent letting the reader sit with it
    const charDelay = Math.min(90, Math.max(20, (lineDuration * typeShare * 1000) / line.length));

    await typeLine(line, charDelay);
    await sleep(lineDuration * holdShare * 1000);
  }

  speechBubble.classList.add('hidden');
  await sleep(400);
  startCelebration();
}

// -----------------------------------------------------------------------------
// 7. CELEBRATION — floating hearts, confetti, a glowing heart flying at the
//    viewer, then the "World's Best Dad" achievement card.
// -----------------------------------------------------------------------------
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnFloatingHeart() {
  const heart = document.createElement('span');
  heart.className = 'floating-heart';
  heart.textContent = Math.random() > 0.5 ? '❤️' : '💛';
  heart.style.left = `${randomBetween(4, 96)}%`;
  heart.style.setProperty('--drift', `${randomBetween(-60, 60)}px`);
  heart.style.setProperty('--spin', `${randomBetween(-35, 35)}deg`);
  heart.style.fontSize = `${randomBetween(1.1, 2.2)}rem`;
  heart.style.animationDuration = `${randomBetween(4.5, 8)}s`;
  heart.addEventListener('animationend', () => heart.remove());
  heartsField.appendChild(heart);
}

function spawnConfettiPiece() {
  const piece = document.createElement('span');
  piece.className = 'confetti-piece';
  const colors = ['#e8b35a', '#ff5d6c', '#f3d8a0', '#c4203a', '#faf3e6'];
  piece.style.background = colors[Math.floor(Math.random() * colors.length)];
  piece.style.left = `${randomBetween(0, 100)}%`;
  piece.style.setProperty('--drift', `${randomBetween(-120, 120)}px`);
  piece.style.setProperty('--spin', `${randomBetween(360, 900)}deg`);
  piece.style.animationDuration = `${randomBetween(2.6, 4.5)}s`;
  piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
  piece.addEventListener('animationend', () => piece.remove());
  confettiField.appendChild(piece);
}

function startCelebration() {
  celebrationEl.classList.remove('hidden');

  // Waves of hearts + confetti for a few seconds.
  const burst = setInterval(() => {
    for (let i = 0; i < 3; i++) spawnFloatingHeart();
    for (let i = 0; i < 6; i++) spawnConfettiPiece();
  }, 220);
  setTimeout(() => clearInterval(burst), 4200);

  // The glowing heart flies toward the viewer, then the achievement reveals.
  setTimeout(() => {
    glowHeartEl.classList.add('fly');
  }, 600);

  setTimeout(() => {
    achievementEl.classList.remove('hidden');
    requestAnimationFrame(() => achievementEl.classList.add('reveal'));
  }, 2200);

  // Keep a gentle, slower drizzle of hearts going for the rest of the experience.
  setInterval(() => spawnFloatingHeart(), 900);
}

// -----------------------------------------------------------------------------
// 8. BOOTSTRAP — wire up the Start button
// -----------------------------------------------------------------------------
startButton.addEventListener('click', async () => {
  startButton.disabled = true;

  // Fire the audio-unlock attempt first/synchronously-ish, before any awaited
  // camera permission prompt can break the "user gesture" chain on iOS.
  unlockAudio();

  try {
    await startCamera();
  } catch (err) {
    console.error('[camera] Permission denied or unavailable:', err);
    startHint.textContent = "We couldn't access your camera. Please allow camera access and try again.";
    startHint.style.color = '#ff8d8d';
    startButton.disabled = false;
    return;
  }

  // Cinematic transition: fade the start screen away to reveal the live feed.
  startScreen.classList.add('fade-out');

  initThree();
  animate();
  await loadAvatar();

  // A short breath before the avatar "speaks", so the reveal feels intentional.
  await sleep(700);
  runStoryline();
});

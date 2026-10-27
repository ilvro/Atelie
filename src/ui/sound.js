/**
 * Ateliê — Sons da bancada sintetizados com Web Audio API.
 * 
 * Zero arquivos de áudio externos, zero licenças a registrar.
 * Sons sintetizados proceduralmente: ruído filtrado, envelopes curtos
 * e pequenas variações aleatórias de tom e volume a cada toque.
 */

import { getSettings, saveSettings } from './settings.js';

let audioCtx = null;
let masterGain = null;
let cachedNoiseBuffer = null;
let lastTypeSoundTime = 0;
let uvHumNode = null;
let isUvActive = false;

// Default sound configuration
const DEFAULT_SOUND_SETTINGS = {
  enabled: false,
  volume: 80,
  typing: 'auto', // 'auto' | 'typewriter' | 'pen' | 'off'
  ambient: false,
};

let currentSettings = { ...DEFAULT_SOUND_SETTINGS };

/**
 * Normalizes text removing accents for reliable comparison.
 */
function clean(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Maps a font family, library ID, or category to a typing voice.
 * @param {string|object} font
 * @returns {'typewriter'|'pen'|'computer'|'soft'}
 */
export function matchTypingVoice(font) {
  if (!font) return 'soft';

  let family = '';
  let category = '';
  let library = '';

  if (typeof font === 'string') {
    family = font;
  } else if (typeof font === 'object') {
    family = font.family || font.name || '';
    category = font.category || '';
    library = font.library || font.id || '';
  }

  const fam = clean(family);
  const cat = clean(category);
  const lib = clean(library);
  const combined = `${fam} ${cat} ${lib}`;

  // 1. Typewriter (Máquina de escrever)
  if (
    cat.includes('maquina de escrever') ||
    combined.includes('cutive') ||
    combined.includes('courier') ||
    combined.includes('special elite') ||
    combined.includes('typewriter') ||
    combined.includes('undermachine')
  ) {
    return 'typewriter';
  }

  // 2. Handwriting / Marker (Letra à mão / Marcador)
  if (
    cat.includes('letra a mao') ||
    cat.includes('marcador') ||
    combined.includes('caveat') ||
    combined.includes('kalam') ||
    combined.includes('reenie beanie') ||
    combined.includes('homemade apple') ||
    combined.includes('nothing you could do') ||
    combined.includes('dawning of a new day') ||
    combined.includes('rock salt') ||
    combined.includes('permanent marker') ||
    combined.includes('handwriting') ||
    combined.includes('script')
  ) {
    return 'pen';
  }

  // 3. Computer terminal (Tela de computador)
  if (
    cat.includes('tela de computador') ||
    combined.includes('vt323') ||
    combined.includes('share tech') ||
    combined.includes('terminal') ||
    combined.includes('console')
  ) {
    return 'computer';
  }

  // 4. Default soft tactile key
  return 'soft';
}

/**
 * Gets current sound settings.
 */
export function getSoundSettings() {
  try {
    const s = getSettings();
    if (s && s.sound) {
      currentSettings = { ...DEFAULT_SOUND_SETTINGS, ...s.sound };
    }
  } catch {}
  return { ...currentSettings };
}

/**
 * Updates sound settings.
 */
export function setSoundSettings(updates = {}) {
  currentSettings = { ...currentSettings, ...updates };
  try {
    saveSettings({ sound: currentSettings });
  } catch {}

  // Apply master volume if context is active
  if (masterGain && audioCtx) {
    const vol = (currentSettings.volume / 100) * 0.45;
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), audioCtx.currentTime);
  }

  // Adjust ambient UV hum if active
  if (isUvActive) {
    if (currentSettings.enabled && currentSettings.ambient) {
      startUvHum();
    } else {
      stopUvHum();
    }
  }

  return { ...currentSettings };
}

/**
 * Checks if sound is currently enabled.
 */
export function isSoundEnabled() {
  return Boolean(currentSettings.enabled);
}

export function _resetAudioContextForTesting() {
  audioCtx = null;
  masterGain = null;
  cachedNoiseBuffer = null;
  lastTypeSoundTime = 0;
}

/**
 * Ensures AudioContext and master gain are initialized.
 * Safe to call in browser environments; returns null if AudioContext is not supported.
 */
function ensureAudioContext() {
  const AudioContextClass =
    (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
    (typeof globalThis !== 'undefined' && globalThis.AudioContext);

  if (!AudioContextClass) return null;

  if (audioCtx && audioCtx instanceof AudioContextClass) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  try {
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    const vol = (currentSettings.volume / 100) * 0.45;
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Setup listener to resume context on user gesture
    if (typeof window !== 'undefined') {
      const resume = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      };
      window.addEventListener('pointerdown', resume, { passive: true, once: true });
      window.addEventListener('keydown', resume, { passive: true, once: true });

      // Tab visibility management: mute/suspend when hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (audioCtx && audioCtx.state === 'running') {
            audioCtx.suspend().catch(() => {});
          }
        } else {
          if (audioCtx && audioCtx.state === 'suspended' && currentSettings.enabled) {
            audioCtx.resume().catch(() => {});
          }
        }
      });
    }

    return audioCtx;
  } catch (err) {
    console.warn('[atelie:sound] Não foi possível iniciar Web Audio:', err);
    return null;
  }
}

/**
 * Reusable white noise buffer to minimize allocations.
 */
function getNoiseBuffer(ctx) {
  if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return cachedNoiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoiseBuffer = buffer;
  return buffer;
}

// --- Synthesizers ---

function synthTypewriterKey(ctx, destination, vol = 1) {
  const t = ctx.currentTime;
  const v = vol * (0.85 + Math.random() * 0.3);

  // Impact click (bandpass noise)
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  noise.offset = Math.random() * 0.3;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  const freq = 1800 * (1 + (Math.random() * 0.2 - 0.1));
  bandpass.frequency.setValueAtTime(freq, t);
  bandpass.Q.setValueAtTime(3.0, t);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, t);
  noiseGain.gain.linearRampToValueAtTime(0.35 * v, t + 0.002);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

  noise.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(destination);
  noise.start(t);
  noise.stop(t + 0.035);

  // Metallic body ping
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const oscFreq = 540 * (1 + (Math.random() * 0.16 - 0.08));
  osc.frequency.setValueAtTime(oscFreq, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.028);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.18 * v, t);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);

  osc.connect(oscGain);
  oscGain.connect(destination);
  osc.start(t);
  osc.stop(t + 0.03);
}

function synthTypewriterSpace(ctx, destination, vol = 1) {
  const t = ctx.currentTime;
  const v = vol * (0.9 + Math.random() * 0.2);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  noise.offset = Math.random() * 0.3;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(650, t);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, t);
  noiseGain.gain.linearRampToValueAtTime(0.3 * v, t + 0.003);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(destination);
  noise.start(t);
  noise.stop(t + 0.05);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.04);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.22 * v, t);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

  osc.connect(oscGain);
  oscGain.connect(destination);
  osc.start(t);
  osc.stop(t + 0.045);
}

function synthTypewriterBell(ctx, destination, vol = 1) {
  const t = ctx.currentTime;

  // Mechanical bell ding (resonant sine)
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1975, t);

  const bellGain = ctx.createGain();
  bellGain.gain.setValueAtTime(0.001, t);
  bellGain.gain.linearRampToValueAtTime(0.28 * vol, t + 0.003);
  bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

  osc.connect(bellGain);
  bellGain.connect(destination);
  osc.start(t);
  osc.stop(t + 0.46);

  // Carriage return slide
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, t + 0.04);
  filter.frequency.exponentialRampToValueAtTime(600, t + 0.16);
  filter.Q.setValueAtTime(2.0, t);

  const slideGain = ctx.createGain();
  slideGain.gain.setValueAtTime(0.0001, t);
  slideGain.gain.setValueAtTime(0.001, t + 0.04);
  slideGain.gain.linearRampToValueAtTime(0.14 * vol, t + 0.07);
  slideGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

  noise.connect(filter);
  filter.connect(slideGain);
  slideGain.connect(destination);
  noise.start(t + 0.04);
  noise.stop(t + 0.19);
}

function synthPenStroke(ctx, destination, vol = 1) {
  const t = ctx.currentTime;
  const duration = 0.045 + Math.random() * 0.035;
  const v = vol * (0.8 + Math.random() * 0.4);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  noise.offset = Math.random() * 0.3;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  const centerFreq = 2600 + (Math.random() * 800 - 400);
  bandpass.frequency.setValueAtTime(centerFreq, t);
  bandpass.Q.setValueAtTime(1.8, t);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.18 * v, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(destination);
  noise.start(t);
  noise.stop(t + duration + 0.01);
}

function synthComputerKey(ctx, destination, vol = 1, isEnter = false) {
  const t = ctx.currentTime;
  if (isEnter) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18 * vol, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(t);
    osc.stop(t + 0.08);
  } else {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200 + Math.random() * 200, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.015);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.08 * vol, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

    osc.connect(oscGain);
    oscGain.connect(destination);
    osc.start(t);
    osc.stop(t + 0.016);
  }
}

function synthSoftKey(ctx, destination, vol = 1) {
  const t = ctx.currentTime;
  const v = vol * (0.85 + Math.random() * 0.3);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220 * (1 + (Math.random() * 0.1 - 0.05)), t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.024);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12 * v, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.024);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(t);
  osc.stop(t + 0.026);
}

function synthStamp(ctx, destination, vol = 1, isWax = false) {
  const t = ctx.currentTime;

  // Initial impact transient
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const nFilter = ctx.createBiquadFilter();
  nFilter.type = 'bandpass';
  nFilter.frequency.setValueAtTime(1100, t);
  nFilter.Q.setValueAtTime(1.5, t);

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.001, t);
  nGain.gain.linearRampToValueAtTime(0.35 * vol, t + 0.003);
  nGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

  noise.connect(nFilter);
  nFilter.connect(nGain);
  nGain.connect(destination);
  noise.start(t);
  noise.stop(t + 0.055);

  // Heavy wooden impact thud
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.09);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.4 * vol, t);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

  osc.connect(oscGain);
  oscGain.connect(destination);
  osc.start(t);
  osc.stop(t + 0.095);

  if (isWax) {
    // Sizzle / crackle of hot wax
    const waxNoise = ctx.createBufferSource();
    waxNoise.buffer = getNoiseBuffer(ctx);
    const waxFilter = ctx.createBiquadFilter();
    waxFilter.type = 'highpass';
    waxFilter.frequency.setValueAtTime(3200, t);

    const waxGain = ctx.createGain();
    waxGain.gain.setValueAtTime(0.0001, t);
    waxGain.gain.setValueAtTime(0.001, t + 0.015);
    waxGain.gain.linearRampToValueAtTime(0.16 * vol, t + 0.04);
    waxGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);

    waxNoise.connect(waxFilter);
    waxFilter.connect(waxGain);
    waxGain.connect(destination);
    waxNoise.start(t + 0.015);
    waxNoise.stop(t + 0.18);
  }
}

function synthTapeTear(ctx, destination, vol = 1) {
  const t = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.exponentialRampToValueAtTime(3400, t + 0.11);
  filter.Q.setValueAtTime(2.2, t);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.3 * vol, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  noise.start(t);
  noise.stop(t + 0.13);
}

function synthPaperSlide(ctx, destination, vol = 1) {
  const t = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(750, t);
  filter.frequency.linearRampToValueAtTime(1100, t + 0.08);
  filter.frequency.linearRampToValueAtTime(650, t + 0.18);
  filter.Q.setValueAtTime(1.2, t);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.24 * vol, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  noise.start(t);
  noise.stop(t + 0.2);
}

function synthUvToggle(ctx, destination, vol = 1) {
  const t = ctx.currentTime;

  // First micro-click
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(2400, t);
  osc1.frequency.exponentialRampToValueAtTime(600, t + 0.008);

  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(0.28 * vol, t);
  gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.008);

  osc1.connect(gain1);
  gain1.connect(destination);
  osc1.start(t);
  osc1.stop(t + 0.01);

  // Second micro-click (14ms later)
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(1400, t + 0.014);
  osc2.frequency.exponentialRampToValueAtTime(350, t + 0.024);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0.0001, t);
  gain2.gain.setValueAtTime(0.22 * vol, t + 0.014);
  gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.026);

  osc2.connect(gain2);
  gain2.connect(destination);
  osc2.start(t + 0.014);
  osc2.stop(t + 0.028);
}

/** Changing the room light: a lamp button, a metal flashlight click, or a match being struck. */
export function lightSwitchVoice(mode) {
  if (mode === 'candle') return 'match';
  if (mode === 'flashlight') return 'metal';
  return 'button';
}

function synthLightSwitch(ctx, destination, mode = 'lamp', vol = 1) {
  const t = ctx.currentTime;
  const voice = lightSwitchVoice(mode);
  if (voice === 'match') {
    // Scratch, then the small flare
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.3 * vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(t);
    noise.stop(t + 0.22);
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = voice === 'metal' ? 'square' : 'triangle';
  osc.frequency.setValueAtTime(voice === 'metal' ? 1900 : 1100, t);
  osc.frequency.exponentialRampToValueAtTime(voice === 'metal' ? 760 : 420, t + 0.02);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.26 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + (voice === 'metal' ? 0.05 : 0.03));
  osc.connect(gain);
  gain.connect(destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

function synthArchive(ctx, destination, vol = 1) {
  const t = ctx.currentTime;

  // Sharp impact snap
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const nFilter = ctx.createBiquadFilter();
  nFilter.type = 'bandpass';
  nFilter.frequency.setValueAtTime(1500, t);

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.001, t);
  nGain.gain.linearRampToValueAtTime(0.45 * vol, t + 0.004);
  nGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

  noise.connect(nFilter);
  nFilter.connect(nGain);
  nGain.connect(destination);
  noise.start(t);
  noise.stop(t + 0.065);

  // Heavy resonant desk impact (sub-bass)
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(190, t);
  osc.frequency.exponentialRampToValueAtTime(36, t + 0.16);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.55 * vol, t);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

  osc.connect(oscGain);
  oscGain.connect(destination);
  osc.start(t);
  osc.stop(t + 0.19);
}

function synthDelete(ctx, destination, vol = 1) {
  const t = ctx.currentTime;
  const pulses = [0, 0.035, 0.075];
  pulses.forEach((offset, idx) => {
    const pt = t + offset;
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    noise.offset = Math.random() * 0.3;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 + idx * 300, pt);
    filter.Q.setValueAtTime(1.8, pt);

    const gain = ctx.createGain();
    const pv = vol * (0.28 - idx * 0.05);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.setValueAtTime(0.001, pt);
    gain.gain.linearRampToValueAtTime(pv, pt + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, pt + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(pt);
    noise.stop(pt + 0.045);
  });
}

function startUvHum() {
  if (uvHumNode || !audioCtx || !masterGain) return;
  try {
    const t = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(60, t);

    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, t);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);

    const gain = audioCtx.createGain();
    const targetGain = 0.035;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(targetGain, t + 0.25);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc1.start(t);
    osc2.start(t);

    uvHumNode = { osc1, osc2, gain };
  } catch (err) {
    console.warn('[atelie:sound] Erro ao iniciar zumbido UV:', err);
  }
}

function stopUvHum() {
  if (!uvHumNode || !audioCtx) return;
  try {
    const { osc1, osc2, gain } = uvHumNode;
    const t = audioCtx.currentTime;
    gain.gain.linearRampToValueAtTime(0.0001, t + 0.15);
    setTimeout(() => {
      try {
        osc1.stop();
        osc2.stop();
        osc1.disconnect();
        osc2.disconnect();
      } catch {}
    }, 160);
  } catch {}
  uvHumNode = null;
}

// Spies and inspection for tests
const soundHistory = [];

let inWindowPlay = false;

/**
 * Main public playback function.
 * @param {'type'|'stamp'|'tape'|'paper-slide'|'slide'|'uv-toggle'|'archive'|'delete'|'crumple'|'undo'} name
 * @param {object} [options]
 * @returns {boolean} Whether sound was synthesized
 */
export function play(name, options = {}) {
  // If a test or consumer has wrapped window.__atelie.sound.play, route through it
  if (!inWindowPlay && typeof window !== 'undefined' && window.__atelie?.sound?.play && window.__atelie.sound.play !== play) {
    inWindowPlay = true;
    try {
      return window.__atelie.sound.play(name, options);
    } finally {
      inWindowPlay = false;
    }
  }

  const settings = getSoundSettings();
  const isPreview = Boolean(options.preview);

  // If disabled and not previewing, exit immediately
  if (!settings.enabled && !isPreview) {
    return false;
  }

  // If page is hidden, stay silent
  if (typeof document !== 'undefined' && document.hidden) {
    return false;
  }

  // Test spy / hook
  if (typeof window !== 'undefined' && window.__atelie?.sound?.onPlay) {
    try { window.__atelie.sound.onPlay(name, options); } catch {}
  }
  soundHistory.push({ name, options, time: Date.now() });
  if (soundHistory.length > 50) soundHistory.shift();

  // Typing throttle: at most 1 sound per 35 ms
  if (name === 'type') {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastTypeSoundTime < 35) {
      return false;
    }
    lastTypeSoundTime = now;
  }

  const ctx = ensureAudioContext();
  if (!ctx || !masterGain) {
    return false;
  }

  try {
    switch (name) {
      case 'type': {
        const voiceMode = options.forceVoice || (settings.typing === 'auto' ? matchTypingVoice(options.font) : settings.typing);
        if (voiceMode === 'off') return false;

        const key = options.key || '';
        if (voiceMode === 'typewriter') {
          if (key === 'Enter') synthTypewriterBell(ctx, masterGain);
          else if (key === ' ') synthTypewriterSpace(ctx, masterGain);
          else synthTypewriterKey(ctx, masterGain);
        } else if (voiceMode === 'pen') {
          synthPenStroke(ctx, masterGain);
        } else if (voiceMode === 'computer') {
          synthComputerKey(ctx, masterGain, 1, key === 'Enter');
        } else {
          synthSoftKey(ctx, masterGain);
        }
        return true;
      }

      case 'stamp': {
        const isWax = options.variant === 'wax';
        synthStamp(ctx, masterGain, 1, isWax);
        return true;
      }

      case 'tape': {
        synthTapeTear(ctx, masterGain);
        return true;
      }

      case 'slide':
      case 'paper-slide': {
        synthPaperSlide(ctx, masterGain);
        return true;
      }

      case 'uv-toggle': {
        synthUvToggle(ctx, masterGain);
        const nextIsUv = options.on ?? !isUvActive;
        isUvActive = nextIsUv;

        if (isUvActive && settings.ambient) {
          startUvHum();
        } else {
          stopUvHum();
        }
        return true;
      }

      case 'light-switch': {
        synthLightSwitch(ctx, masterGain, options.mode || 'lamp');
        return true;
      }

      case 'archive': {
        synthArchive(ctx, masterGain);
        return true;
      }

      case 'crumple':
      case 'delete': {
        synthDelete(ctx, masterGain);
        return true;
      }

      case 'undo': {
        // As defined in the plan: "amassar curto / sem som" -> quiet slide
        return false;
      }

      default:
        return false;
    }
  } catch (err) {
    console.warn('[atelie:sound] Erro ao reproduzir som:', err);
    return false;
  }
}

/**
 * Initializes sound system and exposes sound object on window.__atelie.
 */
export function initSound() {
  getSoundSettings();

  const soundApi = {
    play,
    getSettings: getSoundSettings,
    setSettings: setSoundSettings,
    matchTypingVoice,
    isSoundEnabled,
    history: soundHistory,
  };

  if (typeof window !== 'undefined') {
    window.__atelieSound = soundApi;
  }

  return soundApi;
}

// Auto-initialize when loaded
initSound();

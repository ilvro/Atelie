import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchTypingVoice,
  getSoundSettings,
  setSoundSettings,
  isSoundEnabled,
  play,
} from '../src/ui/sound.js';

test('sound: matchTypingVoice correctly maps fonts to typing voice', () => {
  // 1. Typewriter
  assert.equal(matchTypingVoice('Courier Prime'), 'typewriter');
  assert.equal(matchTypingVoice('Cutive Mono Regular'), 'typewriter');
  assert.equal(matchTypingVoice('Special Elite'), 'typewriter');
  assert.equal(matchTypingVoice({ family: 'Unknown', category: 'Máquina de escrever' }), 'typewriter');
  assert.equal(matchTypingVoice({ library: 'casa-font-cutivemono-regular' }), 'typewriter');

  // 2. Handwriting and Marker
  assert.equal(matchTypingVoice('Caveat Regular'), 'pen');
  assert.equal(matchTypingVoice('Kalam'), 'pen');
  assert.equal(matchTypingVoice('Permanent Marker'), 'pen');
  assert.equal(matchTypingVoice('Rock Salt'), 'pen');
  assert.equal(matchTypingVoice('Reenie Beanie'), 'pen');
  assert.equal(matchTypingVoice({ family: 'Any', category: 'Letra à mão' }), 'pen');
  assert.equal(matchTypingVoice({ family: 'Any', category: 'Marcador' }), 'pen');

  // 3. Computer / Terminal
  assert.equal(matchTypingVoice('VT323 Regular'), 'computer');
  assert.equal(matchTypingVoice('Share Tech Mono'), 'computer');
  assert.equal(matchTypingVoice({ family: 'Custom', category: 'Tela de computador' }), 'computer');

  // 4. Soft keys (standard typographic / book fonts)
  assert.equal(matchTypingVoice('Libre Baskerville'), 'soft');
  assert.equal(matchTypingVoice('Playfair Display'), 'soft');
  assert.equal(matchTypingVoice('UnifrakturMaguntia'), 'soft');
  assert.equal(matchTypingVoice('Bebas Neue'), 'soft');
  assert.equal(matchTypingVoice(null), 'soft');
  assert.equal(matchTypingVoice(''), 'soft');
});

test('sound: sound settings get and update correctly', () => {
  // Ensure baseline
  setSoundSettings({ enabled: false, volume: 80, typing: 'auto', ambient: false });
  assert.equal(isSoundEnabled(), false);

  const initial = getSoundSettings();
  assert.equal(initial.enabled, false);
  assert.equal(initial.volume, 80);
  assert.equal(initial.typing, 'auto');
  assert.equal(initial.ambient, false);

  // Update
  const updated = setSoundSettings({ enabled: true, volume: 65, typing: 'typewriter', ambient: true });
  assert.equal(updated.enabled, true);
  assert.equal(updated.volume, 65);
  assert.equal(updated.typing, 'typewriter');
  assert.equal(updated.ambient, true);
  assert.equal(isSoundEnabled(), true);

  // Reset to default
  setSoundSettings({ enabled: false, volume: 80, typing: 'auto', ambient: false });
  assert.equal(isSoundEnabled(), false);
});

test('sound: enabled: false does not play and does not instantiate AudioContext', () => {
  let createdContext = false;
  const originalAudioContext = globalThis.AudioContext;

  class MockAudioContext {
    constructor() {
      createdContext = true;
    }
  }

  globalThis.AudioContext = MockAudioContext;

  try {
    setSoundSettings({ enabled: false });
    const res = play('type', { font: 'Courier Prime', key: 'a' });
    assert.equal(res, false, 'play should return false when disabled');
    assert.equal(createdContext, false, 'AudioContext must NOT be created when disabled');
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});

test('sound: typing sounds are throttled to at most 1 every 35 ms', async () => {
  let contextInstances = 0;
  let playedSounds = 0;

  class MockAudioContext {
    constructor() {
      contextInstances++;
      this.currentTime = 0;
      this.sampleRate = 44100;
      this.destination = {};
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    }
    createBufferSource() {
      return {
        connect() {},
        start() { playedSounds++; },
        stop() {},
      };
    }
    createBuffer() {
      return {
        sampleRate: 44100,
        getChannelData() { return new Float32Array(100); },
      };
    }
    createBiquadFilter() {
      return {
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        Q: { setValueAtTime() {} },
        connect() {},
      };
    }
    createOscillator() {
      return {
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    }
  }

  const originalAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = MockAudioContext;

  try {
    setSoundSettings({ enabled: true, volume: 80, typing: 'typewriter' });

    // First keystroke -> plays
    const first = play('type', { font: 'Courier Prime', key: 'a' });
    assert.equal(first, true, 'first keystroke should play');

    // Immediate second keystroke (< 35ms) -> throttled
    const second = play('type', { font: 'Courier Prime', key: 'b' });
    assert.equal(second, false, 'second immediate keystroke should be throttled');

    // Wait 40ms -> should play
    await new Promise(resolve => setTimeout(resolve, 40));
    const third = play('type', { font: 'Courier Prime', key: 'c' });
    assert.equal(third, true, 'keystroke after 40ms should play');
  } finally {
    setSoundSettings({ enabled: false });
    globalThis.AudioContext = originalAudioContext;
  }
});


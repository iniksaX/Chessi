/* Chessi sound engine — fully synthesized with WebAudio. No audio assets needed,
   works offline inside the WebView. Configurable via the theme/JSON customizer. */

export type SoundName =
  | 'move' | 'capture' | 'check' | 'castle' | 'promote' | 'illegal'
  | 'start' | 'end' | 'chat' | 'brilliant' | 'success' | 'fail' | 'gameEnd';

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.5;

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setSoundEnabled(v: boolean) { enabled = v; }
export function setSoundVolume(v: number) { volume = Math.min(1, Math.max(0, v)); }
export function isSoundEnabled() { return enabled; }

function env(gain: GainNode, t0: number, attack: number, peak: number, decay: number) {
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak * volume, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone(freq: number, type: OscillatorType, attack: number, decay: number, peak: number, dest?: AudioNode, when = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  env(g, t0, attack, peak, decay);
  o.connect(g).connect(dest ?? a.destination);
  o.start(t0);
  o.stop(t0 + attack + decay + 0.05);
}

function noiseBurst(attack: number, decay: number, peak: number, filterFreq: number, when = 0, q = 1) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + when;
  const len = Math.ceil(a.sampleRate * (attack + decay + 0.05));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  f.Q.value = q;
  const g = a.createGain();
  env(g, t0, attack, peak, decay);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  switch (name) {
    case 'move':
      // soft wood tap — short bandpassed knock + warm body thump
      noiseBurst(0.0015, 0.075, 0.8, 1050, 0, 2.2);
      tone(300, 'triangle', 0.002, 0.065, 0.38);
      tone(150, 'sine', 0.002, 0.09, 0.3);
      break;
    case 'capture':
      // sharp snapping capture — crack layer on top of the move knock
      noiseBurst(0.001, 0.11, 1.0, 750, 0, 1.6);
      noiseBurst(0.001, 0.045, 0.75, 2400, 0, 3.2);
      tone(175, 'square', 0.002, 0.11, 0.34);
      break;
    case 'check':
      // alert check — rising two-note ping
      tone(1046, 'sine', 0.004, 0.22, 0.5);
      tone(1568, 'sine', 0.004, 0.34, 0.4, undefined, 0.075);
      break;
    case 'castle':
      noiseBurst(0.002, 0.08, 0.6, 750, 0, 1.5);
      noiseBurst(0.002, 0.08, 0.6, 750, 0.11, 1.5);
      break;
    case 'promote':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 'triangle', 0.004, 0.22, 0.4, undefined, i * 0.07));
      break;
    case 'illegal':
      tone(140, 'sawtooth', 0.004, 0.18, 0.3);
      break;
    case 'start':
      tone(392, 'triangle', 0.004, 0.16, 0.4);
      tone(587, 'triangle', 0.004, 0.24, 0.4, undefined, 0.09);
      break;
    case 'end':
    case 'gameEnd':
      [659, 523].forEach((f, i) => tone(f, 'triangle', 0.005, 0.3, 0.42, undefined, i * 0.12));
      break;
    case 'chat':
      tone(940, 'sine', 0.002, 0.08, 0.3);
      break;
    case 'brilliant':
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 'sine', 0.004, 0.26, 0.35, undefined, i * 0.06));
      break;
    case 'success':
      [523, 784].forEach((f, i) => tone(f, 'triangle', 0.004, 0.2, 0.4, undefined, i * 0.08));
      break;
    case 'fail':
      tone(233, 'sawtooth', 0.004, 0.3, 0.28);
      tone(174, 'sawtooth', 0.004, 0.34, 0.28, undefined, 0.1);
      break;
  }
}

/* Call on first user gesture (menu tap, move, etc.) to create/resume the
   AudioContext ahead of time — removes any first-sound latency. */
export function primeAudio() {
  ac();
}

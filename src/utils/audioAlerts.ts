/**
 * Audio feedback sound synthesizers for RFID / Barcode Card Attendance
 * Built with native Web Audio API - 0 external files, 100% offline, 0 latency.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('Web Audio API not supported or blocked:', e);
    return null;
  }
}

const SUCCESS_SOUND_SRC = '/sound/freesound_community-short-beep-tone-47916.mp3';
const WARNING_SOUND_SRC = '/sound/freesound_community-beep-warning-6387.mp3';

let successAudioEl: HTMLAudioElement | null = null;
let warningAudioEl: HTMLAudioElement | null = null;

function playSynthSuccess(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.08);
    gain2.gain.setValueAtTime(0.25, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.25);
  } catch (e) {
    console.warn('Failed to play synth success sound:', e);
  }
}

function playSynthWarning(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.28);
  } catch (e) {
    console.warn('Failed to play synth warning sound:', e);
  }
}

/**
 * 🟢 Short Beep Tone for Clean Attendance (No debts, no overage, active subscription):
 * Plays "freesound_community-short-beep-tone-47916.mp3"
 */
export function playScanSuccessSound(): void {
  try {
    if (!successAudioEl) {
      successAudioEl = new Audio(SUCCESS_SOUND_SRC);
      successAudioEl.preload = 'auto';
    }
    successAudioEl.currentTime = 0;
    const playPromise = successAudioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playSynthSuccess();
      });
    }
  } catch {
    playSynthSuccess();
  }
}

/**
 * ⚠️ Warning Beep Tone for Overages, Debts, or Ending Subscription:
 * Plays "freesound_community-beep-warning-6387.mp3"
 */
export function playScanWarningSound(): void {
  try {
    if (!warningAudioEl) {
      warningAudioEl = new Audio(WARNING_SOUND_SRC);
      warningAudioEl.preload = 'auto';
    }
    warningAudioEl.currentTime = 0;
    const playPromise = warningAudioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playSynthWarning();
      });
    }
  } catch {
    playSynthWarning();
  }
}

/**
 * 🟡 Duplicate Scan Sound: Low dual beep
 * Indicating the student has already checked in today!
 */
export function playScanDuplicateSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(330, now + 0.14);
    gain2.gain.setValueAtTime(0.2, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.3);
  } catch (e) {
    console.warn('Failed to play duplicate sound:', e);
  }
}

/**
 * 🔴 Error / Unregistered Card Sound: Buzz tone
 * Indicating card is not assigned or student is not in this group
 */
export function playScanErrorSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn('Failed to play error sound:', e);
  }
}

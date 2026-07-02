const MUTE_KEY = "pd_admin_alerts_muted";

let audioContext = null;

export function isAdminAlertsMuted() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setAdminAlertsMuted(muted) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

export function unlockAdminAlertAudio() {
  if (typeof window === "undefined") return false;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;

  if (!audioContext) {
    audioContext = new Ctx();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext.state === "running";
}

function playTone(ctx, frequency, start, duration, volume = 0.22) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function playAdminAlertSound() {
  if (isAdminAlertsMuted()) return;
  if (!unlockAdminAlertAudio() || !audioContext) return;

  const start = audioContext.currentTime;
  playTone(audioContext, 880, start, 0.12);
  playTone(audioContext, 880, start + 0.18, 0.12);
  playTone(audioContext, 1100, start + 0.36, 0.18);
  playTone(audioContext, 880, start + 0.58, 0.14);
}

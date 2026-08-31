
function playTone(opts: {
  startHz: number;
  endHz: number;
  duration: number;
  volume: number;
}) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(opts.startHz, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(opts.endHz, ctx.currentTime + opts.duration);
    gain.gain.setValueAtTime(opts.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + opts.duration + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + opts.duration + 0.05);
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext may be blocked until a user gesture
  }
}

export function playNotificationPing() {
  playTone({ startHz: 880, endHz: 440, duration: 0.25, volume: 0.25 });
}

export function playChatChime() {
  playTone({ startHz: 660, endHz: 520, duration: 0.12, volume: 0.14 });
}

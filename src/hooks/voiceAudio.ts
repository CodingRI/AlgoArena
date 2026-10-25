/**
 * Shared voice audio helpers.
 *
 * Local mic is never routed to speakers — that was causing people to hear
 * themselves while other users heard nothing.
 */

const CAPTURE_WORKLET = `
class AlgoArenaCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Float32Array(2048);
    this._off = 0;
  }
  process(inputs, outputs) {
    const ch = inputs[0] && inputs[0][0];
    const out = outputs[0] && outputs[0][0];
    if (out) out.fill(0);
    if (!ch) return true;
    const remaining = this._buf.length - this._off;
    if (ch.length >= remaining) {
      this._buf.set(ch.subarray(0, remaining), this._off);
      this.port.postMessage(this._buf.slice());
      const extra = ch.length - remaining;
      if (extra > 0) {
        this._buf.set(ch.subarray(remaining, remaining + extra), 0);
        this._off = extra;
      } else {
        this._off = 0;
      }
    } else {
      this._buf.set(ch, this._off);
      this._off += ch.length;
    }
    return true;
  }
}
registerProcessor('algoarena-capture', AlgoArenaCapture);
`;

const RELAY_SAMPLE_RATE = 16000;

let voiceCtx: AudioContext | null = null;
let workletReady: Promise<boolean> | null = null;

export function unlockVoiceAudio(): AudioContext {
  if (!voiceCtx || voiceCtx.state === 'closed') {
    voiceCtx = new AudioContext();
    workletReady = null;
  }
  if (voiceCtx.state === 'suspended') void voiceCtx.resume();
  return voiceCtx;
}

export function getVoiceAudioContext(): AudioContext | null {
  return voiceCtx && voiceCtx.state !== 'closed' ? voiceCtx : null;
}

async function ensureWorklet(ctx: AudioContext): Promise<boolean> {
  if (workletReady) return workletReady;
  workletReady = (async () => {
    try {
      const blob = new Blob([CAPTURE_WORKLET], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  })();
  return workletReady;
}

export function pcmRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, samples.length));
}

export function downsampleTo16k(input: Float32Array, inputRate: number): Int16Array {
  const ratio = inputRate / RELAY_SAMPLE_RATE;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const s = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)] ?? 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export function int16ToBase64(data: Int16Array): string {
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

export function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

function int16ToFloat32(data: Int16Array): Float32Array {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] / 32768;
  return out;
}

export class PcmPlayer {
  private nextTime = 0;
  private gain: GainNode;

  constructor(private ctx: AudioContext) {
    this.gain = ctx.createGain();
    this.gain.connect(ctx.destination);
  }

  setVolume(volume01: number) {
    this.gain.gain.value = Math.max(0, Math.min(1, volume01));
  }

  play(int16: Int16Array, sampleRate: number) {
    if (!int16.length) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const float32 = int16ToFloat32(int16);
    const rate = sampleRate || RELAY_SAMPLE_RATE;
    const buffer = this.ctx.createBuffer(1, float32.length, rate);
    buffer.getChannelData(0).set(float32);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);
    const now = this.ctx.currentTime;
    if (this.nextTime < now + 0.08) this.nextTime = now + 0.08;
    if (this.nextTime > now + 0.75) this.nextTime = now + 0.08;
    src.start(this.nextTime);
    this.nextTime += buffer.duration;
  }

  close() {
    try {
      this.gain.disconnect();
    } catch {
      /* already closed */
    }
  }
}

export async function startMicCapture(
  ctx: AudioContext,
  stream: MediaStream,
  onFrame: (samples: Float32Array) => void,
): Promise<() => void> {
  const source = ctx.createMediaStreamSource(stream);
  const silent = ctx.createGain();
  silent.gain.value = 0;
  silent.connect(ctx.destination);

  const ok = await ensureWorklet(ctx);
  if (ok) {
    const node = new AudioWorkletNode(ctx, 'algoarena-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    node.port.onmessage = (e: MessageEvent<Float32Array>) => onFrame(e.data);
    source.connect(node);
    node.connect(silent);
    return () => {
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      silent.disconnect();
    };
  }

  const processor = ctx.createScriptProcessor(2048, 1, 1);
  processor.onaudioprocess = (e) => {
    onFrame(e.inputBuffer.getChannelData(0).slice());
  };
  source.connect(processor);
  processor.connect(silent);
  return () => {
    processor.onaudioprocess = null;
    source.disconnect();
    processor.disconnect();
    silent.disconnect();
  };
}

export const VOICE_RELAY_SAMPLE_RATE = RELAY_SAMPLE_RATE;

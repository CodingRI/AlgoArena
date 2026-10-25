import { useEffect, useRef, useCallback } from 'react';
import socketService from '@/websockets/socketService';
import { SOCKET_EVENTS } from '@/constants';
import { useRoomStore } from '@/store/roomStore';
import { useVoiceStore } from '@/store/voiceStore';
import {
  unlockVoiceAudio,
  startMicCapture,
  downsampleTo16k,
  int16ToBase64,
  base64ToInt16,
  pcmRms,
  PcmPlayer,
  VOICE_RELAY_SAMPLE_RATE,
} from '@/hooks/voiceAudio';

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  const env = import.meta.env as ImportMetaEnv | undefined;
  const turnUrl = env?.VITE_TURN_URL?.trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(',').map((u: string) => u.trim()).filter(Boolean),
      username: env?.VITE_TURN_USERNAME,
      credential: env?.VITE_TURN_CREDENTIAL,
    });
  }
  return servers;
}

const ICE_SERVERS = buildIceServers();

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
  video: false,
};

interface PeerState {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  audioSender?: RTCRtpSender;
  vadFrame?: number;
  analyserCtx?: AudioContext;
  iceQueue: RTCIceCandidateInit[];
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
}

function isMediaConnected(pc: RTCPeerConnection): boolean {
  const cs = pc.connectionState;
  const ice = pc.iceConnectionState;
  return cs === 'connected' || ice === 'connected' || ice === 'completed';
}

function attachAudioElement(): HTMLAudioElement {
  const audioEl = document.createElement('audio');
  audioEl.autoplay = true;
  audioEl.setAttribute('playsinline', 'true');
  audioEl.controls = false;
  audioEl.muted = false;
  audioEl.volume = Math.max(0, Math.min(1, useVoiceStore.getState().voice.volume / 100));
  // display:none can block playback in Chrome; keep it in the layout but invisible
  audioEl.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:0;';
  const mount =
    document.getElementById('algoarena-root')?.shadowRoot?.getElementById('algoarena-mount') ??
    document.body;
  mount.appendChild(audioEl);
  return audioEl;
}

export function useWebRTC(enabled: boolean) {
  const peers = useRef<Map<string, PeerState>>(new Map());
  const localStream = useRef<MediaStream | null>(null);
  const previousMemberIds = useRef<Set<string>>(new Set());
  const relayPlayers = useRef<Map<string, PcmPlayer>>(new Map());
  const stopCapture = useRef<(() => void) | null>(null);
  const lastSpeaking = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const { currentRoom, currentUser } = useRoomStore();
  const { setActiveSpeaker, setVoiceStatus, voice } = useVoiceStore();
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;

  const isHearingPeer = useCallback((userId: string) => {
    const state = peers.current.get(userId);
    if (!state || !isMediaConnected(state.pc)) return false;
    const el = state.audioEl;
    return !!el.srcObject && !el.paused && !el.muted;
  }, []);

  const startRemoteVad = useCallback(
    (userId: string, stream: MediaStream, state: PeerState) => {
      if (state.vadFrame) cancelAnimationFrame(state.vadFrame);
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        state.analyserCtx = ctx;
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          setActiveSpeaker(userId, avg > 12);
          state.vadFrame = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // AudioContext may be blocked until a gesture
      }
    },
    [setActiveSpeaker],
  );

  const destroyPeer = useCallback(
    (userId: string) => {
      const state = peers.current.get(userId);
      if (!state) return;
      if (state.vadFrame) cancelAnimationFrame(state.vadFrame);
      void state.analyserCtx?.close();
      state.audioEl.pause();
      state.audioEl.srcObject = null;
      state.audioEl.remove();
      state.pc.onicecandidate = null;
      state.pc.ontrack = null;
      state.pc.onnegotiationneeded = null;
      state.pc.onconnectionstatechange = null;
      state.pc.close();
      peers.current.delete(userId);
      setActiveSpeaker(userId, false);
    },
    [setActiveSpeaker],
  );

  const getOrCreatePeer = useCallback(
    (remoteUserId: string): RTCPeerConnection => {
      const existing = peers.current.get(remoteUserId);
      if (existing) {
        if (existing.pc.connectionState !== 'closed') return existing.pc;
        destroyPeer(remoteUserId);
      }

      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 8,
      });
      const audioEl = attachAudioElement();
      const state: PeerState = {
        pc,
        audioEl,
        iceQueue: [],
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
      };
      peers.current.set(remoteUserId, state);

      const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
      state.audioSender = transceiver.sender;
      const localTrack = localStream.current?.getAudioTracks()[0] ?? null;
      if (localTrack) void transceiver.sender.replaceTrack(localTrack);

      pc.onicecandidate = (e) => {
        socketService.send(
          SOCKET_EVENTS.WEBRTC_ICE,
          { candidate: e.candidate ? e.candidate.toJSON() : null },
          remoteUserId,
        );
      };

      pc.ontrack = (e) => {
        if (e.track.kind !== 'audio') return;
        if (remoteUserId === currentUserRef.current.id) return;
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        audioEl.srcObject = stream;
        audioEl.muted = false;
        void audioEl.play().catch((error) => {
          console.warn('[WebRTC] Remote audio playback was blocked; click the panel to retry.', error);
        });
        startRemoteVad(remoteUserId, stream, state);
      };

      pc.onnegotiationneeded = async () => {
        try {
          state.makingOffer = true;
          const offer = await pc.createOffer();
          if (pc.signalingState !== 'stable') return;
          await pc.setLocalDescription(offer);
          socketService.send(
            SOCKET_EVENTS.WEBRTC_OFFER,
            { sdp: pc.localDescription },
            remoteUserId,
          );
        } catch (err) {
          console.error('[WebRTC] negotiationneeded:', err);
        } finally {
          state.makingOffer = false;
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          const player = relayPlayers.current.get(remoteUserId);
          player?.close();
          relayPlayers.current.delete(remoteUserId);
        }
        if (pc.connectionState === 'failed') {
          void (async () => {
            try {
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              socketService.send(
                SOCKET_EVENTS.WEBRTC_OFFER,
                { sdp: pc.localDescription },
                remoteUserId,
              );
            } catch {
              /* ICE restart is best-effort; WS relay covers the rest */
            }
          })();
        }
        if (pc.connectionState === 'closed') destroyPeer(remoteUserId);
      };

      return pc;
    },
    [destroyPeer, startRemoteVad],
  );

  const flushIceQueue = useCallback(async (userId: string) => {
    const state = peers.current.get(userId);
    if (!state || !state.pc.remoteDescription) return;
    const queue = [...state.iceQueue];
    state.iceQueue.length = 0;
    for (const c of queue) {
      try {
        await state.pc.addIceCandidate(c ? new RTCIceCandidate(c) : null);
      } catch {
        // ignore stale candidates
      }
    }
  }, []);

  const callPeer = useCallback(
    (remoteUserId: string) => {
      if (remoteUserId === currentUserRef.current.id) return;
      getOrCreatePeer(remoteUserId);
    },
    [getOrCreatePeer],
  );

  // ── Enable / disable microphone ───────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !currentRoom) {
      stopCapture.current?.();
      stopCapture.current = null;
      peers.current.forEach((state) => {
        if (state.audioSender) void state.audioSender.replaceTrack(null);
      });
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
      setVoiceStatus('disconnected');
      setActiveSpeaker(currentUserRef.current.id, false);
      return;
    }

    let cancelled = false;
    const init = async () => {
      setVoiceStatus('connecting');
      try {
        const ctx = unlockVoiceAudio();
        const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.getAudioTracks().forEach((track) => {
          track.contentHint = 'speech';
          track.enabled = !useVoiceStore.getState().voice.isMuted;
        });
        localStream.current = stream;
        setVoiceStatus('connected');

        peers.current.forEach((state) => {
          const track = localStream.current?.getAudioTracks()[0] ?? null;
          if (state.audioSender) void state.audioSender.replaceTrack(track);
        });

        const myId = currentUserRef.current.id;
        for (const m of currentRoom.members) {
          if (m.id !== myId && m.status === 'online' && !m.explicitlyLeft) {
            callPeer(m.id);
          }
        }
        previousMemberIds.current = new Set(currentRoom.members.map((m) => m.id));

        stopCapture.current?.();
        stopCapture.current = await startMicCapture(ctx, stream, (samples) => {
          if (!enabledRef.current || useVoiceStore.getState().voice.isMuted) return;
          const rms = pcmRms(samples);
          const speaking = rms > 0.02;
          if (speaking !== lastSpeaking.current) {
            lastSpeaking.current = speaking;
            setActiveSpeaker(myId, speaking);
            socketService.send(SOCKET_EVENTS.VOICE_SPEAKING, { userId: myId, isSpeaking: speaking });
          }
          if (!speaking) return;
          const pcm = downsampleTo16k(samples, ctx.sampleRate);
          socketService.send(SOCKET_EVENTS.VOICE_CHUNK, {
            pcm: int16ToBase64(pcm),
            sampleRate: VOICE_RELAY_SAMPLE_RATE,
          });
        });
        if (cancelled) {
          stopCapture.current?.();
          stopCapture.current = null;
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[WebRTC] getUserMedia failed:', e);
          setVoiceStatus('error');
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      stopCapture.current?.();
      stopCapture.current = null;
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, currentRoom?.id]);

  // Retry remote playback after a user gesture (autoplay + AudioContext).
  useEffect(() => {
    const unlock = () => {
      unlockVoiceAudio();
      peers.current.forEach((state) => {
        if (state.analyserCtx?.state === 'suspended') void state.analyserCtx.resume();
        if (state.audioEl.srcObject && state.audioEl.paused) {
          void state.audioEl.play().catch(() => {});
        }
      });
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    return () => {
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
  }, []);

  useEffect(() => {
    localStream.current?.getAudioTracks().forEach((t) => {
      t.enabled = !voice.isMuted;
    });
    if (voice.isMuted) {
      lastSpeaking.current = false;
      setActiveSpeaker(currentUserRef.current.id, false);
    }
  }, [voice.isMuted, setActiveSpeaker]);

  useEffect(() => {
    const vol = Math.max(0, Math.min(1, voice.volume / 100));
    peers.current.forEach((state) => {
      state.audioEl.volume = vol;
    });
    relayPlayers.current.forEach((player) => player.setVolume(vol));
  }, [voice.volume]);

  // ── Signaling ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentRoom) return;

    const unsubs: Array<() => void> = [];

    unsubs.push(
      socketService.on<{ sdp: RTCSessionDescriptionInit; fromUserId: string }>(
        SOCKET_EVENTS.WEBRTC_OFFER,
        async ({ sdp, fromUserId }) => {
          if (!fromUserId || fromUserId === currentUserRef.current.id) return;
          const pc = getOrCreatePeer(fromUserId);
          const state = peers.current.get(fromUserId);
          if (!state || !sdp) return;
          try {
            const readyForOffer =
              !state.makingOffer &&
              (pc.signalingState === 'stable' || state.isSettingRemoteAnswerPending);
            const offerCollision = !readyForOffer;
            const isPolite = currentUserRef.current.id.localeCompare(fromUserId) > 0;

            state.ignoreOffer = !isPolite && offerCollision;
            if (state.ignoreOffer) return;
            if (offerCollision && pc.signalingState !== 'stable') {
              await pc.setLocalDescription({ type: 'rollback' });
            }
            await pc.setRemoteDescription(sdp);
            await flushIceQueue(fromUserId);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketService.send(
              SOCKET_EVENTS.WEBRTC_ANSWER,
              { sdp: pc.localDescription },
              fromUserId,
            );
          } catch (e) {
            console.error('[WebRTC] handle offer error:', e);
          }
        },
      ),
    );

    unsubs.push(
      socketService.on<{ sdp: RTCSessionDescriptionInit; fromUserId: string }>(
        SOCKET_EVENTS.WEBRTC_ANSWER,
        async ({ sdp, fromUserId }) => {
          if (!fromUserId || fromUserId === currentUserRef.current.id) return;
          const state = peers.current.get(fromUserId);
          if (!state || !sdp) return;
          try {
            state.isSettingRemoteAnswerPending = true;
            await state.pc.setRemoteDescription(sdp);
            await flushIceQueue(fromUserId);
          } catch (e) {
            console.error('[WebRTC] handle answer error:', e);
          } finally {
            state.isSettingRemoteAnswerPending = false;
          }
        },
      ),
    );

    unsubs.push(
      socketService.on<{ candidate: RTCIceCandidateInit | null; fromUserId: string }>(
        SOCKET_EVENTS.WEBRTC_ICE,
        async ({ candidate, fromUserId }) => {
          if (!fromUserId || fromUserId === currentUserRef.current.id) return;
          getOrCreatePeer(fromUserId);
          const state = peers.current.get(fromUserId);
          if (!state) return;
          if (state.pc.remoteDescription) {
            try {
              await state.pc.addIceCandidate(candidate ? new RTCIceCandidate(candidate) : null);
            } catch (error) {
              if (!state.ignoreOffer) {
                console.error('[WebRTC] Failed to add ICE candidate:', error);
              }
            }
          } else if (candidate) {
            state.iceQueue.push(candidate);
          }
        },
      ),
    );

    unsubs.push(
      socketService.on<{ pcm: string; sampleRate?: number; fromUserId: string }>(
        SOCKET_EVENTS.VOICE_CHUNK,
        ({ pcm, sampleRate, fromUserId }) => {
          if (!fromUserId || fromUserId === currentUserRef.current.id) return;
          if (!pcm) return;
          if (isHearingPeer(fromUserId)) return;
          const ctx = unlockVoiceAudio();
          let player = relayPlayers.current.get(fromUserId);
          if (!player) {
            player = new PcmPlayer(ctx);
            player.setVolume(Math.max(0, Math.min(1, useVoiceStore.getState().voice.volume / 100)));
            relayPlayers.current.set(fromUserId, player);
          }
          try {
            player.play(base64ToInt16(pcm), sampleRate || VOICE_RELAY_SAMPLE_RATE);
          } catch (e) {
            console.warn('[Voice] Failed to play relayed audio:', e);
          }
        },
      ),
    );

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.id]);

  useEffect(() => {
    if (!currentRoom) return;

    const myId = currentUser.id;
    const currentIds = new Set(currentRoom.members.map((m) => m.id));

    if (enabled && localStream.current) {
      for (const m of currentRoom.members) {
        if (m.id !== myId && m.status === 'online' && !m.explicitlyLeft && !previousMemberIds.current.has(m.id)) {
          callPeer(m.id);
        }
      }
    }

    for (const prevId of previousMemberIds.current) {
      if (!currentIds.has(prevId)) {
        destroyPeer(prevId);
        const player = relayPlayers.current.get(prevId);
        player?.close();
        relayPlayers.current.delete(prevId);
      }
    }

    previousMemberIds.current = currentIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.members]);

  useEffect(() => {
    return () => {
      stopCapture.current?.();
      stopCapture.current = null;
      localStream.current?.getTracks().forEach((track) => track.stop());
      localStream.current = null;
      peers.current.forEach((_, userId) => destroyPeer(userId));
      relayPlayers.current.forEach((player) => player.close());
      relayPlayers.current.clear();
    };
    // Only tear down when leaving the room, not when callback identities change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.id]);
}

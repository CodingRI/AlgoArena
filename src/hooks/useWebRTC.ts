
import { useEffect, useRef, useCallback } from 'react';
import socketService from '@/websockets/socketService';
import { SOCKET_EVENTS } from '@/constants';
import { useRoomStore } from '@/store/roomStore';
import { useVoiceStore } from '@/store/voiceStore';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface PeerState {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  audioCtx?: AudioContext;
  audioSender?: RTCRtpSender;
  vadFrame?: number;
  iceQueue: RTCIceCandidateInit[];
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
}

export function useWebRTC(enabled: boolean) {
  const peers = useRef<Map<string, PeerState>>(new Map());
  const localStream = useRef<MediaStream | null>(null);
  const previousMemberIds = useRef<Set<string>>(new Set());

  const { currentRoom, currentUser } = useRoomStore();
  const { setActiveSpeaker, setVoiceStatus, voice } = useVoiceStore();

  // ── VAD ──────────────────────────────────────────────────────────────────

  const startVAD = useCallback(
    (userId: string, stream: MediaStream, state: PeerState) => {
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        state.audioCtx = ctx;

        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          setActiveSpeaker(userId, avg > 12);
          state.vadFrame = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // AudioContext may be blocked until user gesture
      }
    },
    [setActiveSpeaker],
  );

  // ── Destroy a peer ────────────────────────────────────────────────────────

  const destroyPeer = useCallback(
    (userId: string) => {
      const state = peers.current.get(userId);
      if (!state) return;
      if (state.vadFrame) cancelAnimationFrame(state.vadFrame);
      state.audioCtx?.close().catch(() => {});
      state.audioEl.pause();
      state.audioEl.srcObject = null;
      // Remove the element from the document if it was attached
      if (state.audioEl.parentNode) state.audioEl.remove();
      state.pc.close();
      peers.current.delete(userId);
      setActiveSpeaker(userId, false);
    },
    [setActiveSpeaker],
  );

  // ── Create (or recycle) a peer connection ─────────────────────────────────
  // Returns the existing PC if it is healthy; destroys it and creates a fresh
  // one if it is in a failed/closed state.

  const getOrCreatePeer = useCallback(
    (remoteUserId: string): RTCPeerConnection => {
      const existing = peers.current.get(remoteUserId);
      if (existing) {
        const cs = existing.pc.connectionState;
        if (cs !== 'failed' && cs !== 'closed') return existing.pc;
        destroyPeer(remoteUserId); // stale — tear it down first
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Audio element — must be in the document for autoplay policies in some browsers
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.volume = 1;
      // Keep it hidden in the page
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);

      const state: PeerState = {
        pc,
        audioEl,
        iceQueue: [],
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
      };
      peers.current.set(remoteUserId, state);

      // Add local tracks if the mic is already running
      const localTrack = localStream.current?.getAudioTracks()[0];
      if (localTrack && localStream.current) {
        state.audioSender = pc.addTrack(localTrack, localStream.current);
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketService.send(SOCKET_EVENTS.WEBRTC_ICE, { candidate: e.candidate }, remoteUserId);
        }
      };

      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        audioEl.srcObject = stream;
        audioEl.play().catch((error) => {
          console.warn('[WebRTC] Remote audio playback was blocked; click the page to retry.', error);
        });
        startVAD(remoteUserId, stream, state);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          destroyPeer(remoteUserId);
        }
      };

      return pc;
    },
    [startVAD, destroyPeer],
  );

  // ── Flush queued ICE candidates after remote description is set ───────────

  const flushIceQueue = useCallback(async (userId: string) => {
    const state = peers.current.get(userId);
    if (!state || !state.pc.remoteDescription) return;
    const queue = [...state.iceQueue];
    state.iceQueue.length = 0;
    for (const c of queue) {
      try {
        await state.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        // ignore stale candidates
      }
    }
  }, []);

  // ── Send an offer to a remote peer ────────────────────────────────────────

  const callPeer = useCallback(
    async (remoteUserId: string) => {
      const pc = getOrCreatePeer(remoteUserId);
      const state = peers.current.get(remoteUserId);
      if (!state || pc.signalingState !== 'stable') return;
      try {
        state.makingOffer = true;
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        socketService.send(
          SOCKET_EVENTS.WEBRTC_OFFER,
          { sdp: pc.localDescription },
          remoteUserId,
        );
      } catch (e) {
        console.error('[WebRTC] callPeer error:', e);
      } finally {
        state.makingOffer = false;
      }
    },
    [getOrCreatePeer],
  );

  // ── Enable / disable microphone ───────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !currentRoom) {
      // Stop the mic tracks — keep peer connections alive so we can still receive
      peers.current.forEach((state) => {
        if (state.audioSender) void state.audioSender.replaceTrack(null);
      });
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
      setVoiceStatus('disconnected');
      return;
    }

    let cancelled = false;
    const init = async () => {
      setVoiceStatus('connecting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !useVoiceStore.getState().voice.isMuted;
        });
        localStream.current = stream;
        setVoiceStatus('connected');

        // Add mic tracks to any peer connections that were created in receive-only mode
        peers.current.forEach((state) => {
          const track = localStream.current?.getAudioTracks()[0];
          if (!track || !localStream.current) return;
          if (state.audioSender) {
            void state.audioSender.replaceTrack(track);
          } else {
            state.audioSender = state.pc.addTrack(track, localStream.current);
          }
        });

        // Initiate calls to every online member
        if (currentRoom) {
          const myId = currentUser.id;
          for (const m of currentRoom.members) {
            if (m.id !== myId && m.status === 'online') {
              await callPeer(m.id);
            }
          }
          previousMemberIds.current = new Set(currentRoom.members.map((m) => m.id));
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[WebRTC] getUserMedia failed:', e);
          setVoiceStatus('error');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, currentRoom?.id]);

  // Retry audio playback after a user gesture if browser autoplay policy blocked it.
  useEffect(() => {
    const unlockAudio = () => {
      peers.current.forEach((state) => {
        if (state.audioCtx?.state === 'suspended') void state.audioCtx.resume();
        if (state.audioEl.srcObject && state.audioEl.paused) {
          void state.audioEl.play().catch(() => {});
        }
      });
    };
    document.addEventListener('pointerdown', unlockAudio, true);
    document.addEventListener('keydown', unlockAudio, true);
    return () => {
      document.removeEventListener('pointerdown', unlockAudio, true);
      document.removeEventListener('keydown', unlockAudio, true);
    };
  }, []);

  // ── Mute / unmute local tracks ────────────────────────────────────────────

  useEffect(() => {
    localStream.current?.getAudioTracks().forEach((t) => {
      t.enabled = !voice.isMuted;
    });
  }, [voice.isMuted]);

  // ── Signaling — active whenever we are in a room (mic state irrelevant) ───

  useEffect(() => {
    if (!currentRoom) return;

    const unsubs: Array<() => void> = [];

    // Incoming offer: answer it regardless of our mic state
    unsubs.push(
      socketService.on<{ sdp: RTCSessionDescriptionInit; fromUserId: string }>(
        SOCKET_EVENTS.WEBRTC_OFFER,
        async ({ sdp, fromUserId }) => {
          if (!fromUserId || fromUserId === currentUser.id) return;
          const pc = getOrCreatePeer(fromUserId);
          const state = peers.current.get(fromUserId);
          if (!state) return;
          try {
            const readyForOffer =
              !state.makingOffer &&
              (pc.signalingState === 'stable' || state.isSettingRemoteAnswerPending);
            const offerCollision = !readyForOffer;
            const isPolite = currentUser.id.localeCompare(fromUserId) > 0;

            state.ignoreOffer = !isPolite && offerCollision;
            if (state.ignoreOffer) return;
            if (offerCollision && pc.signalingState !== 'stable') {
              await pc.setLocalDescription({ type: 'rollback' });
            }
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
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

    // Incoming answer
    unsubs.push(
      socketService.on<{ sdp: RTCSessionDescriptionInit; fromUserId: string }>(
        SOCKET_EVENTS.WEBRTC_ANSWER,
        async ({ sdp, fromUserId }) => {
          if (!fromUserId) return;
          const state = peers.current.get(fromUserId);
          if (!state) return;
          try {
            state.isSettingRemoteAnswerPending = true;
            await state.pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushIceQueue(fromUserId);
          } catch (e) {
            console.error('[WebRTC] handle answer error:', e);
          } finally {
            state.isSettingRemoteAnswerPending = false;
          }
        },
      ),
    );

    // Incoming ICE candidate — queue if remote description not yet set
    unsubs.push(
      socketService.on<{ candidate: RTCIceCandidateInit; fromUserId: string }>(
        SOCKET_EVENTS.WEBRTC_ICE,
        async ({ candidate, fromUserId }) => {
          if (!fromUserId) return;
          getOrCreatePeer(fromUserId);
          const state = peers.current.get(fromUserId);
          if (!state) return;
          if (state.pc.remoteDescription) {
            try {
              await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              if (!state.ignoreOffer) {
                console.error('[WebRTC] Failed to add ICE candidate:', error);
              }
            }
          } else {
            // Queue until remote description is available
            state.iceQueue.push(candidate);
          }
        },
      ),
    );

    return () => unsubs.forEach((u) => u());
    // Re-register only when the room changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.id]);

  // ── Track member arrivals / departures ────────────────────────────────────

  useEffect(() => {
    if (!currentRoom) return;

    const myId = currentUser.id;
    const currentIds = new Set(currentRoom.members.map((m) => m.id));

    // New online arrivals we haven't called yet
    if (enabled && localStream.current) {
      for (const m of currentRoom.members) {
        if (m.id !== myId && m.status === 'online' && !previousMemberIds.current.has(m.id)) {
          callPeer(m.id);
        }
      }
    }

    // Departed members
    for (const prevId of previousMemberIds.current) {
      if (!currentIds.has(prevId)) destroyPeer(prevId);
    }

    previousMemberIds.current = currentIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.members]);

  // Tear down media and peers when leaving the room or unmounting the hook.
  useEffect(() => {
    return () => {
      localStream.current?.getTracks().forEach((track) => track.stop());
      localStream.current = null;
      peers.current.forEach((_, userId) => destroyPeer(userId));
    };
  }, [currentRoom?.id, destroyPeer]);
}

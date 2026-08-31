import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogIn, Copy, Check, Users, Trash2, RotateCcw } from 'lucide-react';
import JoinRequestCard from './JoinRequestCard';
import { useRoomStore } from '@/store/roomStore';
import { LANGUAGES, AVATARS, DISPLAY_NAME_MAX, ROOM_NAME_MAX_WORDS } from '@/constants';
import { onlineMemberCount, clampDisplayName, clampRoomName } from '@/utils';
import type { Language, AvatarOption, KnownRoom } from '@/types';

const AvatarPicker = ({ selected, onSelect }: { selected: AvatarOption; onSelect: (a: AvatarOption) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {(Object.keys(AVATARS) as AvatarOption[]).map((key) => {
      const a = AVATARS[key];
      return (
        <motion.button
          key={key}
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelect(key)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-base
            transition-all border
            ${selected === key
              ? 'border-violet-500/60 bg-violet-500/20 shadow-glow-sm'
              : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
        >
          {a.emoji}
        </motion.button>
      );
    })}
  </div>
);

const CreateRoomForm = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState('');
  const [hostName, setHostName] = useState('');
  const [language, setLanguage] = useState<Language>('python');
  const [avatar, setAvatar] = useState<AvatarOption>('hacker');
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { createRoom } = useRoomStore();

  const handleCreate = async () => {
    if (!name.trim() || !hostName.trim()) return;
    setLoading(true);
    try {
      const room = await createRoom(name, language, avatar, hostName);
      setCreated(room.id);
    } catch (e) {
      console.error('[CreateRoom]', e);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!created) return;
    navigator.clipboard.writeText(created).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (created) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
        <div className="text-center">
          <div className="text-2xl mb-2">🚀</div>
          <p className="text-sm font-semibold text-zinc-200 font-display">Room Created!</p>
          <p className="text-xs text-zinc-500 mt-1">Share this ID with collaborators</p>
        </div>
        <div className="flex items-center gap-2 bg-galaxy-900 rounded-xl p-3 border border-violet-500/20">
          <span className="flex-1 text-sm font-mono text-violet-300 tracking-widest">{created}</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={copy}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </motion.button>
        </div>
        <button onClick={onClose} className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          Done
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Your Name</label>
        <input
          value={hostName}
          onChange={(e) => setHostName(clampDisplayName(e.target.value, DISPLAY_NAME_MAX))}
          placeholder="Display name"
          maxLength={DISPLAY_NAME_MAX}
          className="w-full bg-galaxy-900 border border-white/10 rounded-lg px-3 py-2
            text-sm text-zinc-200 placeholder-zinc-600 outline-none
            focus:border-violet-500/40 transition-colors font-sans"
        />
        <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{hostName.length}/{DISPLAY_NAME_MAX}</p>
      </div>

      <div>
        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Room Name</label>
        <input
          value={name}
          onChange={(e) => setName(clampRoomName(e.target.value, ROOM_NAME_MAX_WORDS))}
          placeholder="e.g. Two Sum Grind"
          className="w-full bg-galaxy-900 border border-white/10 rounded-lg px-3 py-2
            text-sm text-zinc-200 placeholder-zinc-600 outline-none
            focus:border-violet-500/40 transition-colors font-sans"
        />
        <p className="text-[9px] text-zinc-600 font-mono mt-0.5">
          {name.trim() ? name.trim().split(/\s+/).length : 0}/{ROOM_NAME_MAX_WORDS} words
        </p>
      </div>

      <div>
        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Language</label>
        <div className="flex flex-wrap gap-1">
          {LANGUAGES.map((l) => (
            <button key={l.value} onClick={() => setLanguage(l.value)}
              className={`text-[10px] px-2 py-1 rounded-md font-mono transition-colors
                ${language === l.value ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 bg-white/5'}`}
              style={language === l.value ? { background: `${l.color}25`, color: l.color, border: `1px solid ${l.color}40` } : {}}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Avatar</label>
        <AvatarPicker selected={avatar} onSelect={setAvatar} />
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleCreate}
        disabled={!name.trim() || !hostName.trim() || loading}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all font-display
          ${name.trim() && hostName.trim() && !loading
            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow hover:from-violet-500 hover:to-indigo-500'
            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
          }`}
      >
        {loading ? 'Creating…' : 'Create Room'}
      </motion.button>
    </div>
  );
};

const JoinRoomForm = ({ onBack }: { onBack: () => void }) => {
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<Language>('python');
  const [avatar, setAvatar] = useState<AvatarOption>('astronaut');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { joinRoom, rejoinRoom, joinRequestStatus, leaveRoom, knownRooms } = useRoomStore();
  const knownMatch = knownRooms.find((r) => r.roomId === roomId.trim().toUpperCase());

  const handleJoin = async () => {
    if (!roomId.trim()) return;
    if (!knownMatch && !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      if (knownMatch) {
        await rejoinRoom(knownMatch.roomId);
      } else {
        await joinRoom(roomId.trim().toUpperCase(), name, avatar, language);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  if (joinRequestStatus === 'rejected') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3 py-4">
        <p className="text-sm font-semibold text-red-400 font-display">Request Rejected</p>
        <p className="text-xs text-zinc-500">The host declined your join request.</p>
        <button onClick={() => { leaveRoom(); onBack(); }}
          className="text-xs text-zinc-400 hover:text-zinc-200 underline mt-2">
          Try another room
        </button>
      </motion.div>
    );
  }

  if (joinRequestStatus === 'pending') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3 py-4">
        <p className="text-sm font-semibold text-zinc-200 font-display">Request Sent</p>
        <p className="text-xs text-zinc-500">Waiting for the host to accept...</p>
        <div className="flex justify-center gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400"
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
          ))}
        </div>
        <button onClick={() => { leaveRoom(); onBack(); }}
          className="text-[10px] text-zinc-600 hover:text-zinc-400 mt-1 transition-colors">
          Cancel
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Room ID</label>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          placeholder="XXXXXX"
          className="w-full bg-galaxy-900 border border-white/10 rounded-lg px-3 py-2
            text-sm text-violet-300 placeholder-zinc-600 outline-none font-mono tracking-widest
            focus:border-violet-500/40 transition-colors uppercase"
        />
      </div>
      {knownMatch && (
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-1">
          <p className="text-[11px] font-semibold text-cyan-300 font-display">You've been here before</p>
          <p className="text-[10px] text-zinc-400 font-mono">
            Rejoin {knownMatch.roomName} as {knownMatch.name}
          </p>
        </div>
      )}
      {!knownMatch && (
        <>
          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Your Name</label>
            <input
              value={name}
              maxLength={DISPLAY_NAME_MAX}
              onChange={(e) => setName(clampDisplayName(e.target.value, DISPLAY_NAME_MAX))}
              placeholder="Name"
              className="w-full bg-galaxy-900 border border-white/10 rounded-lg px-3 py-2
                text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/40 transition-colors"
            />
            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{name.length}/{DISPLAY_NAME_MAX}</p>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Language</label>
            <div className="flex flex-wrap gap-1">
              {LANGUAGES.map((l) => (
                <button key={l.value} onClick={() => setLanguage(l.value)}
                  className={`text-[10px] px-2 py-1 rounded-md font-mono transition-colors
                    ${language === l.value ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 bg-white/5'}`}
                  style={language === l.value ? { background: `${l.color}25`, color: l.color, border: `1px solid ${l.color}40` } : {}}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Avatar</label>
            <AvatarPicker selected={avatar} onSelect={setAvatar} />
          </div>
        </>
      )}
      {error && (
        <p className="text-[10px] text-red-400 font-mono">{error}</p>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleJoin}
        disabled={!roomId.trim() || (!knownMatch && !name.trim()) || loading}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all font-display
          ${roomId.trim() && (knownMatch || name.trim()) && !loading
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
          }`}
      >
        {loading ? 'Sending…' : knownMatch ? 'Rejoin Room' : 'Request to Join'}
      </motion.button>
    </div>
  );
};

const RoomPanel = () => {
  const [view, setView] = useState<'home' | 'create' | 'join'>('home');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rejoiningId, setRejoiningId] = useState<string | null>(null);
  const { currentRoom, currentUser, joinRequestStatus, deleteRoom, knownRooms, rejoinRoom, pruneKnownRooms, wasKicked, clearKickNotice } = useRoomStore();
  const isHost = currentRoom?.hostId === currentUser.id;
  const pendingRequests = currentRoom?.pendingRequests.filter((r) => r.status === 'pending') ?? [];
  const leftRooms = currentRoom ? [] : knownRooms;

  useEffect(() => {
    pruneKnownRooms();
  }, [pruneKnownRooms]);

  // Stay on Create/Join while filling the form (view is local, not a dep).
  // Jump home once a room exists, or after leaving back to idle.
  useEffect(() => {
    if (currentRoom) {
      setView('home');
      setConfirmDelete(false);
      return;
    }
    if (joinRequestStatus === 'idle') {
      setView('home');
      setConfirmDelete(false);
    }
  }, [currentRoom, joinRequestStatus]);

  const handleRejoin = async (room: KnownRoom) => {
    setRejoiningId(room.roomId);
    try {
      await rejoinRoom(room.roomId);
    } catch (e) {
      console.error('[Rejoin]', e);
      pruneKnownRooms();
    } finally {
      setRejoiningId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto py-3 px-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.2) transparent' }}>

      {/* Join requests for host */}
      <AnimatePresence>
        {isHost && pendingRequests.map((req) => (
          <JoinRequestCard key={req.id} request={req} />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {view === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-2 space-y-2">
            {wasKicked && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start justify-between gap-2">
                <p className="text-[11px] text-red-300 font-mono">You were removed from the room.</p>
                <button onClick={clearKickNotice} className="text-[10px] text-red-400/70 hover:text-red-300">Dismiss</button>
              </div>
            )}

            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest px-1 mb-3">Rooms</p>

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setView('create')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10
                border border-violet-500/20 hover:border-violet-500/40 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Plus className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-zinc-200 font-display">Create Room</p>
                <p className="text-[10px] text-zinc-500">Start a new session · up to 4 people</p>
              </div>
            </motion.button>

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setView('join')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10
                border border-cyan-500/20 hover:border-cyan-500/40 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <LogIn className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-zinc-200 font-display">Join Room</p>
                <p className="text-[10px] text-zinc-500">Enter a room ID to collaborate</p>
              </div>
            </motion.button>

            {leftRooms.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest px-1">Rooms you left</p>
                {leftRooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-200 font-display truncate">{room.roomName}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {room.roomId} · as {room.name}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRejoin(room)}
                      disabled={rejoiningId === room.roomId}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold
                        bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 transition-colors font-display"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {rejoiningId === room.roomId ? 'Joining…' : 'Rejoin'}
                    </motion.button>
                  </div>
                ))}
              </div>
            )}

            {currentRoom && (
              <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Active Room</span>
                </div>
                <p className="text-sm font-semibold text-zinc-200 font-display truncate">{currentRoom.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Users className="w-3 h-3 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 font-mono">{onlineMemberCount(currentRoom)} members</span>
                  <span className="text-[10px] font-mono text-violet-400">{currentRoom.id}</span>
                </div>

                {/* Delete Room — host only */}
                {isHost && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-1.5 text-[10px] text-red-500/70 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Room
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-red-400 font-mono">This will kick everyone. Sure?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { deleteRoom(); setConfirmDelete(false); }}
                            className="flex-1 py-1 text-[10px] rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 py-1 text-[10px] rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="px-2">
            <button onClick={() => setView('home')} className="text-[10px] text-zinc-500 hover:text-zinc-300 mb-3 font-mono flex items-center gap-1">
              ← Back
            </button>
            <p className="text-sm font-semibold text-zinc-200 font-display mb-3">Create a Room</p>
            <CreateRoomForm onClose={() => setView('home')} />
          </motion.div>
        )}

        {view === 'join' && (
          <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="px-2">
            {joinRequestStatus === 'idle' && (
              <button onClick={() => setView('home')} className="text-[10px] text-zinc-500 hover:text-zinc-300 mb-3 font-mono flex items-center gap-1">
                ← Back
              </button>
            )}
            <p className="text-sm font-semibold text-zinc-200 font-display mb-3">Join a Room</p>
            <JoinRoomForm onBack={() => setView('home')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoomPanel;

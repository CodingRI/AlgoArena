import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogIn, Copy, Check, Users, Lock, Unlock } from 'lucide-react';
import JoinRequestCard from './JoinRequestCard';
import { useRoomStore } from '@/store/roomStore';
import { usePanelStore } from '@/store/panelStore';
import { LANGUAGES, AVATARS } from '@/constants';
import type { Language, AvatarOption } from '@/types';
import { generateRoomId } from '@/utils';

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
  const [language, setLanguage] = useState<Language>('python');
  const [avatar, setAvatar] = useState<AvatarOption>('hacker');
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { createRoom } = useRoomStore();

  const handleCreate = () => {
    if (!name.trim()) return;
    const room = createRoom(name, language);
    setCreated(room.id);
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
        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Room Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Two Sum Grind"
          className="w-full bg-galaxy-900 border border-white/10 rounded-lg px-3 py-2
            text-sm text-zinc-200 placeholder-zinc-600 outline-none
            focus:border-violet-500/40 transition-colors font-sans"
        />
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
        disabled={!name.trim()}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all font-display
          ${name.trim()
            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow hover:from-violet-500 hover:to-indigo-500'
            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
          }`}
      >
        Create Room
      </motion.button>
    </div>
  );
};

const JoinRoomForm = ({ onClose }: { onClose: () => void }) => {
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<Language>('python');
  const [avatar, setAvatar] = useState<AvatarOption>('astronaut');
  const [sent, setSent] = useState(false);
  const { joinRoom } = useRoomStore();

  const handleJoin = () => {
    if (!roomId.trim() || !name.trim()) return;
    joinRoom(roomId.trim().toUpperCase());
    setSent(true);
  };

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3 py-4">
        <div className="text-2xl">⏳</div>
        <p className="text-sm font-semibold text-zinc-200 font-display">Request Sent</p>
        <p className="text-xs text-zinc-500">Waiting for the host to accept...</p>
        <div className="flex justify-center gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400"
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
          ))}
        </div>
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
          placeholder="COLLAB-XXXXXX"
          className="w-full bg-galaxy-900 border border-white/10 rounded-lg px-3 py-2
            text-sm text-violet-300 placeholder-zinc-600 outline-none font-mono tracking-widest
            focus:border-violet-500/40 transition-colors uppercase"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Your Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name"
          className="w-full bg-galaxy-900 border border-white/10 rounded-lg px-3 py-2
            text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-500/40 transition-colors"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1 block">Avatar</label>
        <AvatarPicker selected={avatar} onSelect={setAvatar} />
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleJoin}
        disabled={!roomId.trim() || !name.trim()}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all font-display
          ${roomId.trim() && name.trim()
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
          }`}
      >
        Request to Join
      </motion.button>
    </div>
  );
};

const RoomPanel = () => {
  const [view, setView] = useState<'home' | 'create' | 'join'>('home');
  const { currentRoom, currentUser } = useRoomStore();
  const isHost = currentRoom?.hostId === currentUser.id;
  const pendingRequests = currentRoom?.pendingRequests.filter((r) => r.status === 'pending') ?? [];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto py-3 px-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.2) transparent' }}>

      {/* Join requests for host */}
      <AnimatePresence>
        {isHost && pendingRequests.map((req) => (
          <JoinRequestCard key={req.id} request={req} />
        ))}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-2 space-y-2">
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest px-1 mb-3">Rooms</p>

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setView('create')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10
                border border-violet-500/20 hover:border-violet-500/40 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Plus className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-zinc-200 font-display">Create Room</p>
                <p className="text-[10px] text-zinc-500">Start a new session & invite others</p>
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

            {currentRoom && (
              <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Active Room</span>
                </div>
                <p className="text-sm font-semibold text-zinc-200 font-display">{currentRoom.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Users className="w-3 h-3 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 font-mono">{currentRoom.members.length} members</span>
                  <span className="text-[10px] font-mono text-violet-400">{currentRoom.id}</span>
                </div>
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
            <button onClick={() => setView('home')} className="text-[10px] text-zinc-500 hover:text-zinc-300 mb-3 font-mono flex items-center gap-1">
              ← Back
            </button>
            <p className="text-sm font-semibold text-zinc-200 font-display mb-3">Join a Room</p>
            <JoinRoomForm onClose={() => setView('home')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoomPanel;

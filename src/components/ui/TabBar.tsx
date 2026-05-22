import { motion } from 'framer-motion';
import { MessageSquare, Users, Home, Hand } from 'lucide-react';
import NotificationBadge from '@/components/ui/NotificationBadge';
import { usePanelStore } from '@/store/panelStore';
import { useChatStore } from '@/store/chatStore';
import { useRoomStore } from '@/store/roomStore';
import type { ActiveTab } from '@/types';

const TABS: { id: ActiveTab; icon: typeof MessageSquare; label: string }[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'members', icon: Users, label: 'Members' },
  { id: 'room', icon: Home, label: 'Room' },
];

const TabBar = () => {
  const { activeTab, setActiveTab } = usePanelStore();
  const { unreadCount } = useChatStore();
  const { currentRoom } = useRoomStore();
  const handCount = currentRoom?.members.filter((m) => m.hasRaisedHand).length ?? 0;

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 flex-shrink-0">
      {TABS.map(({ id, icon: Icon, label }) => {
        const isActive = activeTab === id;
        const badge = id === 'chat' ? unreadCount : id === 'members' ? handCount : 0;

        return (
          <motion.button
            key={id}
            whileTap={{ scale: 0.92 }}
            onClick={() => setActiveTab(id)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg
              text-[11px] font-medium transition-all duration-200
              ${isActive
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
          >
            <div className="relative">
              <Icon className="w-3.5 h-3.5" />
              <NotificationBadge count={badge} />
            </div>
            <span>{label}</span>
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 rounded-lg bg-violet-500/10 border border-violet-500/20"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default TabBar;

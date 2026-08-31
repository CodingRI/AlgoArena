import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDraggable } from '@/hooks';
import { usePanelStore } from '@/store/panelStore';
import { useRoomStore } from '@/store/roomStore';
import { useChatStore } from '@/store/chatStore';
import CollapsedBar from '@/components/ui/CollapsedBar';
import RoomHeader from '@/components/room/RoomHeader';
import TabBar from '@/components/ui/TabBar';
import ChatPanel from '@/components/chat/ChatPanel';
import MemberSidebar from '@/components/members/MemberSidebar';
import RoomPanel from '@/components/room/RoomPanel';
import SettingsModal from '@/components/settings/SettingsModal';
import GalaxyBackground from '@/components/ui/GalaxyBackground';

const COLLAPSED_H = 52;
const EXPANDED_W = 360;
const EXPANDED_H = 580;

const FloatingPanel = () => {
  const { panelState, activeTab, togglePanel } = usePanelStore();
  const { currentRoom } = useRoomStore();
  const unreadCount = useChatStore((s) => s.unreadCount);
  const { position, onMouseDown, isDragging } = useDraggable();
  const isExpanded = panelState === 'expanded';

  const effectiveTab = currentRoom ? activeTab : 'room';

  useEffect(() => {
    const handleToggle = () => togglePanel();
    window.addEventListener('leetcode-collab:toggle', handleToggle);
    return () => window.removeEventListener('leetcode-collab:toggle', handleToggle);
  }, [togglePanel]);

  useEffect(() => {
    const visible = isExpanded && effectiveTab === 'chat' && !!currentRoom;
    useChatStore.getState().setChatVisible(visible);
  }, [isExpanded, effectiveTab, currentRoom]);

  return (
    <motion.div
      animate={{
        width: isExpanded ? EXPANDED_W : EXPANDED_W,
        height: isExpanded ? EXPANDED_H : COLLAPSED_H,
      }}
      transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 2147483647,
        minHeight: COLLAPSED_H,
        pointerEvents: 'auto',
        willChange: 'transform',
      }}
      className="overflow-hidden rounded-2xl select-none"
    >
      {/* Glass panel */}
      <div
        className="w-full h-full flex flex-col relative"
        style={{
          background: 'linear-gradient(145deg, rgba(13, 11, 42, 0.97) 0%, rgba(7, 5, 26, 0.99) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.18)',
          boxShadow: !isExpanded && unreadCount > 0
            ? '0 8px 40px rgba(0,0,0,0.7), 0 0 16px rgba(139,92,246,0.45), 0 0 0 1px rgba(167,139,250,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Star background */}
        <GalaxyBackground />

        {!isExpanded ? (
          <div className="w-full h-full relative z-10">
            <CollapsedBar onDragStart={onMouseDown} isDragging={isDragging} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col w-full h-full relative z-10"
          >
            {/* Draggable header */}
            <div
              onMouseDown={onMouseDown}
              className="cursor-grab active:cursor-grabbing"
              style={{ userSelect: 'none' }}
            >
              <RoomHeader />
              <TabBar />
            </div>

            {/* Content area */}
            <AnimatePresence mode="wait">
              <motion.div
                key={effectiveTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col flex-1 min-h-0"
              >
                {effectiveTab === 'chat' && <ChatPanel />}
                {effectiveTab === 'members' && <MemberSidebar />}
                {effectiveTab === 'room' && <RoomPanel />}
              </motion.div>
            </AnimatePresence>

            {/* Settings sheet */}
            <SettingsModal />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default FloatingPanel;

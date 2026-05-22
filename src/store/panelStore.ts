import { create } from 'zustand';
import type { ActiveTab, AppSettings, PanelState } from '@/types';
import { DEFAULT_PANEL_POSITION } from '@/constants';

interface PanelStore {
  panelState: PanelState;
  activeTab: ActiveTab;
  position: { x: number; y: number };
  showSettings: boolean;
  showCreateRoom: boolean;
  showJoinRoom: boolean;

  // Actions
  togglePanel: () => void;
  expandPanel: () => void;
  collapsePanel: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  toggleSettings: () => void;
  openCreateRoom: () => void;
  closeCreateRoom: () => void;
  openJoinRoom: () => void;
  closeJoinRoom: () => void;
}

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetPosition: () => void;
}

export const usePanelStore = create<PanelStore>((set) => ({
  panelState: 'expanded',
  activeTab: 'chat',
  position: DEFAULT_PANEL_POSITION,
  showSettings: false,
  showCreateRoom: false,
  showJoinRoom: false,

  togglePanel: () =>
    set((state) => ({
      panelState: state.panelState === 'collapsed' ? 'expanded' : 'collapsed',
    })),
  expandPanel: () => set({ panelState: 'expanded' }),
  collapsePanel: () => set({ panelState: 'collapsed' }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPosition: (pos) => set({ position: pos }),
  toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
  openCreateRoom: () => set({ showCreateRoom: true, showJoinRoom: false }),
  closeCreateRoom: () => set({ showCreateRoom: false }),
  openJoinRoom: () => set({ showJoinRoom: true, showCreateRoom: false }),
  closeJoinRoom: () => set({ showJoinRoom: false }),
}));

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {
    muteNotifications: false,
    muteChatSounds: false,
    showGalaxyParticles: true,
    compactMode: false,
    themeIntensity: 'medium',
    panelPosition: DEFAULT_PANEL_POSITION,
  },

  updateSettings: (updates) =>
    set((state) => ({ settings: { ...state.settings, ...updates } })),

  resetPosition: () =>
    set((state) => ({
      settings: { ...state.settings, panelPosition: DEFAULT_PANEL_POSITION },
    })),
}));

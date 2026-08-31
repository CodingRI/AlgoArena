import { create } from 'zustand';
import type { ActiveTab, AppSettings, PanelState } from '@/types';
import { DEFAULT_PANEL_POSITION } from '@/constants';

const LS_SETTINGS = 'algo-arena-settings';

const defaultSettings: AppSettings = {
  muteNotifications: false,
  muteChatSounds: false,
  showGalaxyParticles: true,
  compactMode: false,
  themeIntensity: 'medium',
  panelPosition: DEFAULT_PANEL_POSITION,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return defaultSettings;
  }
}

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
  activeTab: 'room',
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
  settings: loadSettings(),

  updateSettings: (updates) =>
    set((state) => {
      const settings = { ...state.settings, ...updates };
      localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
      return { settings };
    }),

  resetPosition: () =>
    set((state) => ({
      settings: { ...state.settings, panelPosition: DEFAULT_PANEL_POSITION },
    })),
}));

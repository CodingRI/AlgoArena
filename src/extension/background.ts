/**
 * Background Service Worker — AlgoArena
 *
 * Handles:
 * - Extension lifecycle events
 * - Toolbar icon click → toggle panel
 * - Badge updates
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AlgoArena] Extension installed');

  chrome.storage.local.set({
    settings: {
      muteNotifications: false,
      muteChatSounds: false,
      showGalaxyParticles: true,
      compactMode: false,
      themeIntensity: 'medium',
    },
    activeRoom: null,
  });
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' }).catch(() => {
    console.warn('[AlgoArena] Panel not available on this page');
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    const count = message.count ?? 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
    sendResponse({ success: true });
  }

  if (message.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set({ settings: message.settings });
    sendResponse({ success: true });
  }
});

export {};

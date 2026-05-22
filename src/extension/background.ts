/**
 * Background Service Worker — LeetCode Collab
 *
 * Handles:
 * - Extension lifecycle events
 * - Tab management
 * - Cross-tab messaging (placeholder)
 * - Badge updates
 */

// Installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[LeetCode Collab] Extension installed');

  // Set default storage
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

// Toolbar icon click — toggle panel on active tab
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' }).catch(() => {
    // Content script not loaded (not a LeetCode page)
    console.warn('[LeetCode Collab] Panel not available on this page');
  });
});

// Update badge count (called from content script via messaging)
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

// PLACEHOLDER: WebSocket relay logic would go here
// In production, the background worker maintains the WS connection
// and relays messages to active tabs for persistence across navigation

export {};

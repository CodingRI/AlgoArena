/**
 * Content Script — LeetCode Collab
 *
 * This script is injected into LeetCode pages.
 * It mounts the React app inside a Shadow DOM to avoid CSS conflicts.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import '../styles/globals.css';

const MOUNT_ID = 'leetcode-collab-root';

function mountExtension() {
  // Avoid double mounting
  if (document.getElementById(MOUNT_ID)) return;

  // Create host element
  const host = document.createElement('div');
  host.id = MOUNT_ID;
  host.style.cssText = [
    'position: fixed',
    'inset: 0',
    'width: 100vw',
    'height: 100vh',
    'z-index: 2147483647',
    'pointer-events: none',
    'overflow: visible',
  ].join('; ');

  document.body.appendChild(host);

  // Shadow DOM for style isolation
  const shadow = host.attachShadow({ mode: 'open' });

  // Mount point inside shadow
  const mountPoint = document.createElement('div');
  mountPoint.id = 'collab-mount';
  mountPoint.style.cssText = [
    'position: fixed',
    'inset: 0',
    'width: 100vw',
    'height: 100vh',
    'pointer-events: none',
  ].join('; ');
  shadow.appendChild(mountPoint);

  // Inject extension fonts & styles into shadow
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('assets/content.css');
  shadow.appendChild(styleLink);

  const excalidrawStyleLink = document.createElement('link');
  excalidrawStyleLink.rel = 'stylesheet';
  excalidrawStyleLink.href = chrome.runtime.getURL('assets/excalidraw.css');
  shadow.appendChild(excalidrawStyleLink);

  // Mount React app
  ReactDOM.createRoot(mountPoint).render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(App, { isExtension: true }),
    )
  );

  console.log('[LeetCode Collab] Extension mounted');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountExtension);
} else {
  mountExtension();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_PANEL') {
    // Forward to React via custom event
    window.dispatchEvent(new CustomEvent('leetcode-collab:toggle'));
    sendResponse({ success: true });
  }
});

export {};

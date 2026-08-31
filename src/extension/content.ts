/**
 * Content Script — AlgoArena
 *
 * Injected into LeetCode pages. Mounts the React app in a Shadow DOM
 * so the panel CSS does not collide with the host page.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import '../styles/globals.css';
import { EXTENSION_MOUNT_ID, TOGGLE_PANEL_EVENT } from '@/constants';

function loadStylesheet(shadow: ShadowRoot, href: string): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    shadow.appendChild(link);
  });
}

async function mountExtension() {
  if (document.getElementById(EXTENSION_MOUNT_ID)) return;

  const host = document.createElement('div');
  host.id = EXTENSION_MOUNT_ID;
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

  const shadow = host.attachShadow({ mode: 'open' });

  const mountPoint = document.createElement('div');
  mountPoint.id = 'algoarena-mount';
  mountPoint.style.cssText = [
    'position: fixed',
    'inset: 0',
    'width: 100vw',
    'height: 100vh',
    'pointer-events: none',
  ].join('; ');
  shadow.appendChild(mountPoint);

  // Wait for styles before React paints so flex layouts aren't height 0.
  await Promise.all([
    loadStylesheet(shadow, chrome.runtime.getURL('assets/content.css')),
    loadStylesheet(shadow, chrome.runtime.getURL('assets/excalidraw.css')),
  ]);

  ReactDOM.createRoot(mountPoint).render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(App, { isExtension: true }),
    )
  );

  console.log('[AlgoArena] Extension mounted');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void mountExtension();
  });
} else {
  void mountExtension();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_PANEL') {
    window.dispatchEvent(new CustomEvent(TOGGLE_PANEL_EVENT));
    sendResponse({ success: true });
  }
});

export {};

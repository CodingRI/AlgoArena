/**
 * Backend URLs.
 *
 * Live Render service:
 *   REST  https://algoarena-rc9v.onrender.com/api
 *   WS    wss://algoarena-rc9v.onrender.com/ws
 *
 * `npm run dev` → localhost:8080 unless VITE_API_BASE / VITE_WS_URL are set.
 * `npm run build:extension` → Render (or `.env.extension` overrides).
 */

export const RENDER_HOST = 'algoarena-rc9v.onrender.com';
export const PROD_API_BASE = `https://${RENDER_HOST}/api`;
export const PROD_WS_URL = `wss://${RENDER_HOST}/ws`;

const LOCAL_API_BASE = 'http://localhost:8080/api';
const LOCAL_WS_URL = 'ws://localhost:8080/ws';

// Vite injects import.meta.env; the content-script esbuild bundle defines these too.
const env = import.meta.env as ImportMetaEnv | undefined;
const isDevPreview = env?.DEV === true && env?.MODE !== 'extension';

export const API_BASE =
  env?.VITE_API_BASE || (isDevPreview ? LOCAL_API_BASE : PROD_API_BASE);

export const WS_URL =
  env?.VITE_WS_URL || (isDevPreview ? LOCAL_WS_URL : PROD_WS_URL);


const RENDER_HOST = 'YOUR-RENDER-SERVICE.onrender.com';

const apiFromEnv = import.meta.env.VITE_API_BASE;
const wsFromEnv = import.meta.env.VITE_WS_URL;

export const API_BASE =
  apiFromEnv ||
  (import.meta.env.DEV ? 'http://localhost:8080/api' : `https://${RENDER_HOST}/api`);

export const WS_URL =
  wsFromEnv ||
  (import.meta.env.DEV ? 'ws://localhost:8080/ws' : `wss://${RENDER_HOST}/ws`);

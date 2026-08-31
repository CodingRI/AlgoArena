
import { build } from 'esbuild';
import { copyFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const PROD_API_BASE = 'https://algoarena-rc9v.onrender.com/api';
const PROD_WS_URL = 'wss://algoarena-rc9v.onrender.com/ws';

function parseEnvFile(contents) {
  const out = {};
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadEnv(fileName) {
  const filePath = resolve(root, fileName);
  if (!existsSync(filePath)) return {};
  return parseEnvFile(await readFile(filePath, 'utf8'));
}

const env = {
  ...(await loadEnv('.env')),
  ...(await loadEnv('.env.extension')),
};

const apiBase = env.VITE_API_BASE || PROD_API_BASE;
const wsUrl = env.VITE_WS_URL || PROD_WS_URL;

console.log('Building content.js (IIFE) …');
console.log(`  API_BASE=${apiBase}`);
console.log(`  WS_URL=${wsUrl}`);

await build({
  entryPoints: [resolve(root, 'src/extension/content.ts')],
  bundle: true,
  format: 'iife',          // no import/export — required for content scripts
  globalName: '_aa',
  outfile: resolve(root, 'dist/content.js'),
  minify: true,
  sourcemap: false,

  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
    'import.meta.env.MODE': '"extension"',
    'import.meta.env.VITE_API_BASE': JSON.stringify(apiBase),
    'import.meta.env.VITE_WS_URL': JSON.stringify(wsUrl),
    global: 'globalThis',
  },

  jsx: 'automatic',
  jsxImportSource: 'react',

  target: ['chrome88'],
  conditions: ['production', 'browser'],

  external: ['chrome'],

  alias: {
    '@': resolve(root, 'src'),
  },

  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.css': 'empty',
    '.svg': 'dataurl',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
  },

  logLevel: 'info',
});

const assetsDir = resolve(root, 'dist/assets');
await mkdir(assetsDir, { recursive: true });
await copyFile(
  resolve(root, 'node_modules/@excalidraw/excalidraw/dist/prod/index.css'),
  resolve(assetsDir, 'excalidraw.css'),
);

console.log('dist/content.js ready (self-contained IIFE)');

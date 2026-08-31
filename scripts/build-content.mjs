
import { build } from 'esbuild';
import { copyFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

console.log('Building content.js (IIFE) …');

await build({
  entryPoints: [resolve(root, 'src/extension/content.ts')],
  bundle: true,
  format: 'iife',          // no import/export — required for content scripts
  globalName: '_lc',       // IIFE wrapper name (unused, but required by esbuild)
  outfile: resolve(root, 'dist/content.js'),
  minify: true,
  sourcemap: false,

  define: {
    'process.env.NODE_ENV': '"production"',
    // Some packages check for `global`
    global: 'globalThis',
  },

  // Use the React 17+ automatic JSX transform
  jsx: 'automatic',
  jsxImportSource: 'react',

  target: ['chrome88'],
  conditions: ['production', 'browser'],

  // `chrome` is injected by the browser into content script scope
  external: ['chrome'],

  // Resolve @/… aliases to src/
  alias: {
    '@': resolve(root, 'src'),
  },

  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    // CSS is loaded by content.ts via a <link> pointing to assets/content.css —
    // not via JS imports. Any CSS import encountered in the dep tree is silenced.
    '.css': 'empty',
    // Inline small assets
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

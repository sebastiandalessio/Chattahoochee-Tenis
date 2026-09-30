// Genera dist/Chattahoochee-Tenis.html: el juego entero en UN archivo, que se abre con doble clic
// (sin servidor) y se puede mandar por WhatsApp o email.

import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { copyFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = path.join(root, '.dist-single');

await build({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  base: './',
  logLevel: 'warn',
  plugins: [viteSingleFile()],
  build: { outDir: tmp, emptyOutDir: true },
});

mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'Chattahoochee-Tenis.html');
copyFileSync(path.join(tmp, 'index.html'), out);
rmSync(tmp, { recursive: true, force: true });
const kb = Math.round(statSync(out).size / 1024);
console.log(`Listo: dist/Chattahoochee-Tenis.html (${kb} KB)`);

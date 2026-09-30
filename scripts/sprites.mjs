// npm run sprites: convierte los sprites definidos en código (src/art/) en PNG dentro de public/sprites/.
// Con "--preview" además arma hojas ampliadas (x4, con fondo) en playtest/ para revisarlas a ojo.

import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { encodePNG } from './png.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'sprites');
const preview = process.argv.includes('--preview');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
mkdirSync(outDir, { recursive: true });

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const mod = await server.ssrLoadModule('/src/art/sheets.ts');
  if (process.argv.includes('--venues')) {
    // Las cuatro sedes pintadas (fondo + capa de luz), x2, para revisar.
    const v = await server.ssrLoadModule('/src/art/venueArt.ts');
    const pdir = path.join(root, 'playtest', 'sprites');
    mkdirSync(pdir, { recursive: true });
    for (const id of ['breckenridge', 'springRidge', 'stRegis', 'chattahoochee']) {
      const t0 = Date.now();
      const { background, overlay } = v.paintVenue(id);
      const out = new Uint8ClampedArray(background.data);
      if (overlay) {
        for (let i = 0; i < out.length; i += 4) {
          const a = overlay.data[i + 3] / 255;
          for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c] * (1 - a) + overlay.data[i + c] * a);
        }
      }
      writeFileSync(path.join(pdir, `sede_${id}.png`), encodePNG(background.w, background.h, out, 2));
      console.log(`playtest/sprites/sede_${id}.png (${Date.now() - t0} ms)`);
    }
  }
  if (process.argv.includes('--objects') || process.argv.includes('--cutscene')) {
    // Lámina de objetos (Betty, Mabel, minicargadora...) ampliada, para revisar.
    // Con --cutscene: la utilería de la torre, el Boss y los finales.
    const cut = process.argv.includes('--cutscene');
    const o = await server.ssrLoadModule(cut ? '/src/art/cutsceneArt.ts' : '/src/art/objects.ts');
    const imgs = cut
      ? [o.drawTrophy(), o.drawCan(true), o.drawCan(false), o.drawMate(), o.drawTrophyPlant(), o.drawChiroTable(), o.drawDrakkar(), o.drawStadium(), o.drawLongKayak()]
      : [o.drawBetty(), o.drawMabel('normal'), o.drawMabel('ding'), o.drawLoader(), o.drawCone(), o.drawPothole(), o.drawSign(), o.drawFriedBall()];
    const W = imgs.reduce((a, i) => a + i.w + 4, 0);
    const H = Math.max(...imgs.map((i) => i.h));
    const data = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < data.length; i += 4) data.set([108, 116, 132, 255], i);
    let ox = 0;
    for (const img of imgs) {
      for (let y = 0; y < img.h; y++)
        for (let x = 0; x < img.w; x++) {
          const s = (y * img.w + x) * 4;
          if (img.data[s + 3] === 0) continue;
          data.set(img.data.subarray(s, s + 4), (y * W + ox + x) * 4);
        }
      ox += img.w + 4;
    }
    const pdir = path.join(root, 'playtest', 'sprites');
    mkdirSync(pdir, { recursive: true });
    const name = cut ? 'utileria.png' : 'objetos.png';
    writeFileSync(path.join(pdir, name), encodePNG(W, H, data, cut ? 4 : 6));
    console.log('playtest/sprites/' + name);
  }
  if (process.argv.includes('--board')) {
    // Lámina de revisión (todos los personajes juntos), solo para mirar: va a playtest/.
    const pdir = path.join(root, 'playtest', 'sprites');
    mkdirSync(pdir, { recursive: true });
    for (const view of ['front', 'back']) {
      for (const oi of [0, 1]) {
        const img = mod.buildBoard(view, oi);
        const bg = new Uint8ClampedArray(img.data.length);
        for (let i = 0; i < img.data.length; i += 4) {
          const a = img.data[i + 3] / 255;
          const px = (i / 4) % img.w;
          const py = Math.floor(i / 4 / img.w);
          const base = (Math.floor(px / 48) + Math.floor(py / 64)) % 2 === 0 ? [120, 128, 144] : [108, 116, 132];
          for (let c = 0; c < 3; c++) bg[i + c] = Math.round(img.data[i + c] * a + base[c] * (1 - a));
          bg[i + 3] = 255;
        }
        const name = `lamina_${view}_${oi}.png`;
        writeFileSync(path.join(pdir, name), encodePNG(img.w, img.h, bg, 3));
        console.log('playtest/sprites/' + name);
      }
    }
    process.exitCode = 0;
  }
  const images = process.argv.includes('--board') ? [] : mod.allImages().filter((i) => !only || i.name.startsWith(only));
  for (const { name, img } of images) {
    writeFileSync(path.join(outDir, `${name}.png`), encodePNG(img.w, img.h, img.data));
    console.log(`public/sprites/${name}.png  (${img.w}×${img.h})`);
    if (preview) {
      const pdir = path.join(root, 'playtest', 'sprites');
      mkdirSync(pdir, { recursive: true });
      // Fondo gris azulado de cancha para ver contornos.
      const bg = new Uint8ClampedArray(img.data.length);
      for (let i = 0; i < img.data.length; i += 4) {
        const a = img.data[i + 3] / 255;
        const px = (i / 4) % img.w;
        const py = Math.floor(i / 4 / img.w);
        const grid = (Math.floor(px / 48) + Math.floor(py / 48)) % 2 === 0 ? [120, 128, 144] : [108, 116, 132];
        const base = name.includes('retrato') ? [60, 64, 80] : grid;
        for (let c = 0; c < 3; c++) bg[i + c] = Math.round(img.data[i + c] * a + base[c] * (1 - a));
        bg[i + 3] = 255;
      }
      writeFileSync(path.join(pdir, `${name}.png`), encodePNG(img.w, img.h, bg, 4));
    }
  }
} finally {
  await server.close();
}

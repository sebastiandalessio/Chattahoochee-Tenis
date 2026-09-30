// Prueba automatizada: levanta el servidor de desarrollo, abre el juego en Edge (Playwright),
// juega solo, saca capturas en playtest/ y avisa si hubo errores en la consola.
//
// Uso: npm run playtest            (todas las pruebas)
//      npm run playtest -- demo    (solo CPU contra CPU)
//      npm run playtest -- human   (un "humano" robot apretando teclas de verdad)

import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'playtest');
mkdirSync(outDir, { recursive: true });
const which = process.argv[2] ?? 'all';

const server = await createServer({ root, server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
console.log('Servidor en', base);

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
}
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

const shot = async (name) => {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log('  captura:', path.relative(root, file));
};
const state = () =>
  page.evaluate(() => {
    const c = window.__cht;
    if (!c) return null;
    const m = c.match;
    return {
      phase: m.phase,
      time: m.time,
      score: m.score,
      ball: { x: m.ball.x, y: m.ball.y, z: m.ball.z },
      players: m.players.map((p) => ({ x: p.x, y: p.y, air: p.air, anim: p.anim, counters: p.counters })),
      server: m.rally.server,
      lastHitter: m.rally.lastHitter,
      bounces: m.rally.bouncesSinceHit,
      decided: m.rally.decided,
      meter: m.meter,
      fps: c.scene.game.loop.actualFps,
    };
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  // ------------------------------------------------------------ archivo único (doble clic, sin servidor)
  if (which === 'file') {
    const file = path.join(root, 'dist', 'Chattahoochee-Tenis.html');
    console.log('Archivo único:', file);
    await page.goto(`file:///${file.replace(/\\/g, '/')}?demo=1&speed=3&games=2`);
    await sleep(4000);
    await shot('07-archivo-unico');
    const s = await state();
    console.log('  corre:', s ? `sí (fase ${s.phase}, t=${s.time.toFixed(1)}s)` : 'NO');
  }

  // ------------------------------------------------------------ pantalla final: Enter y Esc
  if (which === 'all' || which === 'end') {
    console.log('Pantalla final (Enter = otro partido, Esc = menú)');
    const waitEnd = async () => {
      const t0 = Date.now();
      let s = await state();
      while (s && s.phase !== 'matchOver' && Date.now() - t0 < 180000) {
        await sleep(500);
        s = await state();
      }
      await sleep(2500);
    };
    await page.goto(`${base}?demo=1&games=2&speed=8&seed=4`);
    await waitEnd();
    await shot('08-final-antes-enter');
    await page.keyboard.press('Enter');
    await sleep(1200);
    let s = await state();
    const scenes = () =>
      page.evaluate(() => window.__cht.scene.game.scene.getScenes(true).map((x) => x.sys.settings.key));
    console.log('  después de Enter:', s?.phase, 't=', s?.time.toFixed(1), 'escenas', JSON.stringify(await scenes()));
    await waitEnd();
    await page.keyboard.press('Escape');
    await sleep(1200);
    console.log('  después de Esc: escenas', JSON.stringify(await scenes()));
    await shot('09-final-despues-esc');
  }

  // ------------------------------------------------------------ pantalla final jugando vos (desde el menú)
  if (which === 'all' || which === 'end1p') {
    console.log('Pantalla final en 1 jugador, entrando desde el menú');
    const scenes = () =>
      page.evaluate(() => window.__cht?.scene.game.scene.getScenes(true).map((x) => x.sys.settings.key));
    await page.goto(base);
    await sleep(800);
    for (let round = 0; round < 2; round++) {
      // En el menú: ir a "Duración", elegir 2 games y arrancar.
      await page.keyboard.press('Enter');
      await sleep(800);
      await page.evaluate(() => {
        const sc = window.__cht.scene;
        sc.setup.speed = 8;
        sc.match.score.rules.gamesPerSet = 1;
      });
      const t0 = Date.now();
      let s = await state();
      let last = 0;
      while (s && s.phase !== 'matchOver' && Date.now() - t0 < 120000) {
        if (s.server === 0 && (s.phase === 'preServe' || s.phase === 'toss') && Date.now() - last > 120) {
          await page.keyboard.press('z');
          last = Date.now();
        }
        await sleep(40);
        s = await state();
      }
      // Apretar Enter/Esc apenas termina (antes de que aparezca el cartel) y después.
      await page.keyboard.press(round === 0 ? 'Enter' : 'Escape');
      await sleep(2500);
      await shot(`10-final-1p-${round}`);
      console.log(`  ronda ${round}: escenas`, JSON.stringify(await scenes()), 'fase', (await state())?.phase);
      await page.keyboard.press(round === 0 ? 'Enter' : 'Escape');
      await sleep(1500);
      console.log(`  ronda ${round} después de ${round === 0 ? 'Enter' : 'Esc'}:`, JSON.stringify(await scenes()), (await state())?.phase);
      if (round === 0) {
        // Volver al menú con la pausa para probar la segunda visita.
        await page.keyboard.press('Escape');
        await sleep(300);
        await page.keyboard.press('ArrowUp');
        await sleep(100);
        await page.keyboard.press('Enter');
        await sleep(1000);
        console.log('  pausa → menú:', JSON.stringify(await scenes()));
        await shot('11-menu-segunda-visita');
      }
    }
  }

  // ------------------------------------------------------------ personajes en la cancha
  if (which === 'all' || which === 'chars') {
    console.log('Personajes en la cancha');
    const pairs = [
      ['elRosco', 'trueTincho'],
      ['elSeba', 'volpi'],
      ['angelito', 'elVikingo'],
    ];
    for (const [a, b] of pairs) {
      await page.goto(`${base}?demo=1&games=2&speed=1&seed=9&p1=${a}&p2=${b}`);
      await sleep(1200);
      for (let i = 0; i < 3; i++) {
        await sleep(1500);
        await shot(`12-${a}-vs-${b}-${i}`);
      }
      const s = await state();
      console.log(`  ${a} vs ${b}: fase ${s?.phase}, fps ${s?.fps?.toFixed(0)}`);
    }
  }

  // ------------------------------------------------------------ mística: especiales en acción
  if (which === 'all' || which === 'mistica') {
    console.log('Mística y especiales');
    const pairs = [
      ['volpi', 'angelito'],
      ['elVikingo', 'elSeba'],
      ['trueTincho', 'elRosco'],
    ];
    const fillRecipes = () =>
      page.evaluate(() => {
        const m = window.__cht.match;
        for (const p of m.players) for (const i of [0, 1, 2]) m.myst.tick(p, i);
      });
    for (const [a, b] of pairs) {
      await page.goto(`${base}?demo=1&games=4&speed=1&seed=31&p1=${a}&p2=${b}`);
      await sleep(1500);
      const taken = new Set();
      const t0 = Date.now();
      while (Date.now() - t0 < 75000 && taken.size < 6) {
        await fillRecipes();
        const s = await page.evaluate(() => {
          const c = window.__cht;
          const m = c.match;
          return {
            freeze: c.scene.freeze,
            ghosts: m.ghosts.length,
            loader: m.players.some((p) => p.mods.pointBuff === 'minicargadora'),
            dinein: m.players.some((p) => p.mods.pointBuff === 'dinein'),
            obra: !!m.obra,
            tag: m.ball.tag,
            hurt: m.players.some((p) => p.anim === 'hurt' || p.anim === 'taunt'),
          };
        });
        const want = [
          ['cutin', s.freeze > 0.8],
          ['betty', s.ghosts > 0],
          ['loader', s.loader],
          ['obra', s.obra && !s.loader],
          ['frita', s.tag === 'frita'],
          ['paralelo', s.tag === 'paralelo'],
          ['rey', s.tag === 'reyDeCopas'],
          ['dinein', s.dinein],
          ['gesto', s.hurt],
        ];
        for (const [name, ok] of want) {
          if (ok && !taken.has(name)) {
            taken.add(name);
            // El título del cut-in entra animado: esperar a que se vea.
            if (name === 'cutin') await sleep(450);
            // Las tres pelotas de Betty salen juntas del cañón: esperar a que se separen.
            if (name === 'betty' || name === 'rey' || name === 'paralelo') await sleep(250);
            await shot(`13-${a}-${name}`);
          }
        }
        await sleep(60);
      }
      console.log(`  ${a} vs ${b}: capturas ${[...taken].join(', ')}`);
    }
  }

  // ------------------------------------------------------------ página local de personajes
  if (which === 'sprites') {
    console.log('Página sprites.html');
    await page.goto(`${base}sprites.html`);
    await sleep(2500);
    const photos = await page.evaluate(() =>
      [...document.querySelectorAll('.photos img')].map((i) => i.naturalWidth > 0),
    );
    console.log(`  fotos cargadas: ${photos.filter(Boolean).length}/${photos.length}`);
    for (const id of ['elRosco', 'elSeba', 'trueTincho', 'volpi', 'elVikingo', 'angelito']) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      await section.screenshot({ path: path.join(outDir, `sprites-${id}.png`) });
      console.log('  captura:', `playtest/sprites-${id}.png`);
    }
  }

  // ------------------------------------------------------------ captura para el README
  if (which === 'captura') {
    await page.goto(`${base}?demo=1&games=4&seed=5&p1=elSeba&p2=volpi`);
    const t0 = Date.now();
    let s = await state();
    await sleep(3000);
    while (Date.now() - t0 < 60000) {
      s = await state();
      if (s && s.phase === 'rally' && s.ball.z > 0.9 && Math.abs(s.ball.y) < 7 && s.time > 8) break;
      await sleep(30);
    }
    mkdirSync(path.join(root, 'docs'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'docs', 'captura.png') });
    console.log('  captura: docs/captura.png');
  }

  // ------------------------------------------------------------ menú
  if (which === 'all' || which === 'menu') {
    console.log('Menú de prueba');
    await page.goto(base);
    await sleep(800);
    await shot('01-menu');
  }

  // ------------------------------------------------------------ CPU contra CPU
  if (which === 'all' || which === 'demo') {
    console.log('CPU contra CPU (x3)');
    await page.goto(`${base}?demo=1&games=2&speed=3&seed=11`);
    await sleep(1500);
    await shot('02-demo-saque');
    for (let i = 0; i < 6; i++) {
      await sleep(1200);
      await shot(`03-demo-${i}`);
    }
    const t0 = Date.now();
    let s = await state();
    while (s && s.phase !== 'matchOver' && Date.now() - t0 < 240000) {
      await sleep(1000);
      s = await state();
    }
    await sleep(2500);
    await shot('04-demo-final');
    console.log('  resultado:', JSON.stringify(s?.score.completedSets), 'fps', s?.fps?.toFixed(0));
    console.log('  contadores:', JSON.stringify(s?.players.map((p) => p.counters)));
  }

  // ------------------------------------------------------------ "humano" con teclado
  if (which === 'all' || which === 'human') {
    console.log('Humano robot contra la CPU (teclado real)');
    await page.goto(`${base}?play=1&games=2&seed=21&diff=1`);
    await sleep(1000);
    const held = new Set();
    const hold = async (key, on) => {
      if (on && !held.has(key)) {
        held.add(key);
        await page.keyboard.down(key);
      } else if (!on && held.has(key)) {
        held.delete(key);
        await page.keyboard.up(key);
      }
    };
    const t0 = Date.now();
    let shots = 0;
    let lastPress = 0;
    let s = await state();
    while (s && s.phase !== 'matchOver' && Date.now() - t0 < 150000) {
      const me = s.players[0];
      if (s.phase === 'preServe' && s.server === 0 && Date.now() - lastPress > 600) {
        await page.keyboard.press('z');
        lastPress = Date.now();
      } else if (s.phase === 'toss' && s.server === 0 && s.meter > 0.7 && Date.now() - lastPress > 150) {
        await page.keyboard.press('z');
        lastPress = Date.now();
      } else if (s.phase === 'rally' && s.lastHitter === 1 && !s.decided) {
        // Ir hacia donde viene la pelota (con la raqueta a la derecha).
        const tx = s.ball.x - 0.7;
        const dx = tx - me.x;
        await hold('ArrowRight', dx > 0.25);
        await hold('ArrowLeft', dx < -0.25);
        const d = me.y - s.ball.y;
        if (s.ball.y > 0 && d < 1.0 && d > -0.3 && Math.abs(s.ball.x - me.x) < 1.5 && Date.now() - lastPress > 300) {
          await page.keyboard.press('z');
          lastPress = Date.now();
          shots++;
        }
      } else {
        await hold('ArrowRight', false);
        await hold('ArrowLeft', false);
        const dx = 0 - me.x;
        await hold('ArrowRight', dx > 0.5);
        await hold('ArrowLeft', dx < -0.5);
      }
      if (shots === 3) {
        await shot('05-humano-peloteo');
        shots++;
      }
      await sleep(16);
      s = await state();
    }
    await shot('06-humano-final');
    console.log('  estado:', s?.phase, 'marcador', JSON.stringify(s?.score.games), 'golpes', s?.players[0].counters.shots);
  }
} finally {
  if (errors.length) {
    console.log('\nERRORES EN CONSOLA:');
    for (const e of errors.slice(0, 20)) console.log(' -', e);
  } else console.log('\nSin errores en la consola.');
  await browser.close();
  await server.close();
}

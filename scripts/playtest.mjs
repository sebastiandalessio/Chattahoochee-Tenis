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

  // ------------------------------------------------------------ torre, chicanas, Boss y finales (npm run playtest -- torre)
  if (which === 'pantallas') {
    const scenes = () =>
      page.evaluate(() => {
        const g = window.__game;
        return g ? g.scene.getScenes(true).map((x) => x.sys.settings.key) : [];
      });
    const go = async (q, name, wait = 1500) => {
      await page.goto(`${base}?${q}`);
      await sleep(wait);
      await shot(name);
      console.log('  ', name, JSON.stringify(await scenes()));
    };
    console.log('Pantallas del hito 5');
    await go('select=1', '20-seleccion');
    await page.keyboard.press('ArrowRight');
    await sleep(400);
    await shot('20-seleccion-seba');
    await go('tower=volpi&step=2', '21-torre', 1800);
    await go('tower=elRosco&step=5', '21-torre-boss', 1800);
    await go('vs=elRosco&seed=3', '22-vs', 1500);
    // Buscar una torre donde el primer rival sea un clásico (Rosco contra Tincho).
    for (let seed = 1; seed < 40; seed++) {
      const ok = await page.evaluate(async (sd) => {
        const m = await import('/src/game/tower.ts');
        const c = await import('/src/scenes/CharSelectScene.ts');
        return m.newTower('elRosco', 0, c.mulberry(sd), sd).fights[0].rival === 'trueTincho';
      }, seed);
      if (ok) {
        await go(`vs=elRosco&seed=${seed}`, '22-vs-clasico', 2600);
        break;
      }
    }
    await go('duel=angelito&seed=4', '23-chicana', 2200);
    await page.keyboard.press('ArrowDown');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(2600);
    await shot('23-chicana-respuesta');
    await go('gameover=elVikingo', '24-gameover', 1200);
    await sleep(4500);
    await shot('24-gameover-impaciente');
    await go('boss=trueTincho', '25-boss-llegada', 2500);
    await sleep(5000);
    await shot('25-boss-bajando');
    await sleep(6000);
    await shot('25-boss-reglas');
    await go('bossmatch=volpi&auto=1&speed=1', '26-boss-relevo', 3500);
    await go('bosswin=angelito', '27-boss-festejo', 2000);
    await sleep(3200);
    await shot('27-boss-al-rio');
    for (const who of ['elRosco', 'elSeba', 'trueTincho', 'volpi', 'elVikingo', 'angelito']) {
      await page.goto(`${base}?ending=${who}`);
      for (let i = 0; i < 3; i++) {
        await sleep(i === 0 ? 2200 : 1600);
        await shot(`28-final-${who}-${i + 1}`);
        await page.keyboard.press('Enter');
      }
      await sleep(1200);
      await shot(`28-final-${who}-desbloqueo`);
    }
  }

  if (which === 'torre') {
    // Una torre entera jugada por la CPU (con ?auto=1), apretando ENTER en cada pantalla.
    console.log('Torre completa en automático');
    const scenes = () =>
      page.evaluate(() => {
        const g = window.__game;
        return g ? g.scene.getScenes(true).map((x) => x.sys.settings.key) : [];
      });
    // Partidos cortos (2 games) para que la prueba no tarde tanto.
    await page.goto(base);
    await page.evaluate(() => localStorage.setItem('chattahoochee-tenis-v1', JSON.stringify({ options: { games: 2, difficulty: 1 } })));
    await page.goto(`${base}?tower=elSeba&auto=1&speed=8&seed=5`);
    const t0 = Date.now();
    let last = '';
    const seen = new Set();
    while (Date.now() - t0 < 1500000) {
      const sc = (await scenes()).join(',');
      if (sc !== last) {
        console.log('   →', sc);
        last = sc;
      }
      if (sc === 'ending' || sc === 'testMenu') break;
      if (!seen.has(sc) && ['tower', 'vs', 'duel', 'gameover', 'bossIntro', 'bossWin'].includes(sc)) {
        seen.add(sc);
        await sleep(900);
        await shot(`29-torre-${sc}`);
      }
      if (sc !== 'match') await page.keyboard.press('Enter');
      else {
        const st = await page.evaluate(() => {
          const c = window.__cht;
          return c ? { phase: c.match.phase, end: c.scene.endUi?.length ?? 0 } : null;
        });
        if (st && st.end) {
          await shot('29-torre-resultado');
          await page.keyboard.press('Enter');
        }
      }
      await sleep(700);
    }
    console.log('  terminó en', last, 'en', Math.round((Date.now() - t0) / 1000), 's');
  }

  // ------------------------------------------------------------ sedes y eventos (npm run playtest -- sedes)
  if (which === 'sedes') {
    const only = process.argv[3];
    const plan = [
      ['breckenridge', ['pelota', 'silbato', 'bomba', 'gansoDuerme']],
      ['springRidge', ['ardilla', 'pina', 'polen', 'ciervo', 'entrenador']],
      ['stRegis', ['pickleball', 'pregunta', 'mozo', 'gansoRoba']],
      ['chattahoochee', ['pelota']],
    ];
    for (const [venue, evs] of plan) {
      if (only && only !== venue) continue;
      console.log('Sede', venue);
      await page.goto(`${base}?demo=1&venue=${venue}&games=6&seed=11&speed=1`);
      await sleep(3500);
      await shot(`sede-${venue}`);
      for (const ev of evs) {
        // Fuerza el evento en el próximo punto y espera a que aparezca (los de peloteo pueden
        // no llegar a salir si el punto termina antes: se reintenta).
        let seen = null;
        for (let attempt = 0; attempt < 4 && !seen; attempt++) {
          await page.evaluate((id) => {
            window.__cht.match.venueEv.force = id;
            window.__evWant = id;
            window.__evSeen = null;
            const m = window.__cht.match;
            if (!m.__hooked) {
              m.__hooked = true;
              const orig = m.emit.bind(m);
              m.emit = (e) => {
                if (e.type === 'venue' && e.id === window.__evWant) window.__evSeen = e.id + ':' + e.stage;
                return orig(e);
              };
            }
          }, ev);
          const t0 = Date.now();
          while (Date.now() - t0 < 12000) {
            seen = await page.evaluate(() => window.__evSeen);
            if (seen) break;
            await sleep(50);
          }
        }
        const wait = { pelota: 350, ardilla: 450, silbato: 250, bomba: 500, pina: 500, polen: 700, ciervo: 3500, entrenador: 300, pickleball: 700, mozo: 3000, pregunta: 2600, gansoDuerme: 1200, gansoRoba: 300 }[ev] ?? 400;
        await sleep(wait);
        await shot(`sede-${venue}-${ev}`);
        if (ev === 'pregunta') {
          await sleep(3000);
          await shot(`sede-${venue}-${ev}-2`);
        }
        console.log('  evento', ev, seen ? 'visto' : 'NO APARECIÓ');
        await sleep(600);
      }
    }
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

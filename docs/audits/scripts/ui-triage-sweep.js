/**
 * UI triage sweep — one pass, three hypotheses, no code changes.
 *
 * H1 column width (layout.maxContent 560 / maxCatalogo 720) at 375/768/1280/1920
 * H2 icon button optical centring (AppButton icon marginLeft -space.xs)
 * H3 baseline alignment between two type scales (AppInput labelRow, PageHeader sezione)
 *
 * Evidence = geometry measured in the DOM + a capture at known dimensions.
 * Run with NODE_PATH pointing at a Playwright install:
 *   NODE_PATH=<npx-cache>/node_modules node docs/audits/scripts/ui-triage-sweep.js
 *
 * Captures and `dati.json` are written to `.playwright-mcp/ui-triage/captures`,
 * which is gitignored: the numbers go into the audit, the images never do.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8083';
const OUT = path.join(__dirname, '..', '..', '..', '.playwright-mcp', 'ui-triage', 'captures');
const USERNAME = 'giulia.bianchi';
const PASSWORD = 'demo1234';

const VIEWPORTS = [
  { nome: '375', width: 375, height: 812 },
  { nome: '768', width: 768, height: 1024 },
  { nome: '1280', width: 1280, height: 800 },
  { nome: '1920', width: 1920, height: 1080 },
];
const THEMES = ['light', 'dark'];

const ROTTE = [
  { path: '/', nome: '01-catalogo', attesa: /servizi|offro|cerco/i },
  { path: '/match', nome: '02-match', attesa: /match|coda|propost/i },
  { path: '/offer-and-request', nome: '03-offro-e-cerco', attesa: /offro|cerco/i },
  { path: '/agreements', nome: '04-accordi', attesa: /accord/i },
  { path: '/profile', nome: '05-profilo', attesa: /profilo|aspetto/i },
  { path: '/notifications', nome: '06-notifiche', attesa: /notific/i },
  { path: '/edit-profile', nome: '07-modifica-profilo', attesa: /profilo/i },
];

const risultati = { h1: [], h2: [], h3: [], pagine: [] };

/* ---------------------------------------------------------------- probes */

const PROBE = String.raw`
(() => {
  const px = (v) => parseFloat(v) || 0;
  const ctx = document.createElement('canvas').getContext('2d');
  const fontOf = (el) => {
    const cs = getComputedStyle(el);
    return cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  };
  const metrics = (font) => {
    ctx.font = font;
    const m = ctx.measureText('Hxg');
    return {
      ascent: m.fontBoundingBoxAscent,
      descent: m.fontBoundingBoxDescent,
      lh: m.fontBoundingBoxAscent + m.fontBoundingBoxDescent,
    };
  };
  const isIcono = (el) => /ionicons|material|fontawesome|feather|entypo/i.test(getComputedStyle(el).fontFamily || '');
  const testoDi = (el) => (el.textContent || '').trim();
  const figli = (el) => [...el.children].filter((c) => testoDi(c).length > 0);

  // ---- H1: la colonna ----
  function colonne() {
    const out = [];
    for (const el of document.querySelectorAll('div,section,main')) {
      const cs = getComputedStyle(el);
      if (cs.maxWidth !== '560px' && cs.maxWidth !== '720px') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 100) continue;
      out.push({
        maxWidth: px(cs.maxWidth),
        largh: +r.width.toFixed(2),
        sinistra: +r.left.toFixed(2),
        destra: +(document.documentElement.clientWidth - r.right).toFixed(2),
        scrollH: el.scrollHeight,
        clientH: el.clientHeight,
      });
    }
    return {
      viewport: document.documentElement.clientWidth,
      scrollbar: window.innerWidth - document.documentElement.clientWidth,
      colonne: out,
    };
  }

  // ---- H2: bottone con icona ----
  function foglie(el) {
    const out = [];
    for (const e of el.querySelectorAll('*')) {
      const haFigliConTesto = [...e.children].some((c) => testoDi(c).length > 0);
      if (!haFigliConTesto && testoDi(e).length > 0) out.push(e);
    }
    return out;
  }

  function bottoniIcona() {
    const out = [];
    const candidati = [...document.querySelectorAll('[role="button"], a[href], button')];
    for (const b of candidati) {
      const lf = foglie(b);
      const icone = lf.filter(isIcono);
      const testi = lf.filter((e) => !isIcono(e));
      if (icone.length !== 1 || testi.length !== 1) continue;
      const icona = icone[0];
      const testo = testi[0];
      const glyph = testoDi(icona);
      const rb = b.getBoundingClientRect();
      const ri = icona.getBoundingClientRect();
      const rt = testo.getBoundingClientRect();
      if (rb.width < 40 || rt.height <= 0 || ri.width <= 0) continue;
      const csT = getComputedStyle(testo);
      const lh = px(csT.lineHeight) || metrics(fontOf(testo)).lh;
      if (rt.height > lh * 1.4) continue;
      ctx.font = fontOf(testo);
      const mt = ctx.measureText(testoDi(testo));
      ctx.font = fontOf(icona);
      const mg = ctx.measureText(glyph);
      const inkIcona = { s: ri.left - mg.actualBoundingBoxLeft, d: ri.left + mg.actualBoundingBoxRight };
      const inkTesto = { s: rt.left - mt.actualBoundingBoxLeft, d: rt.left + mt.actualBoundingBoxRight };
      const inkSinistra = Math.min(inkIcona.s, inkTesto.s);
      const inkDestra = Math.max(inkIcona.d, inkTesto.d);
      const centroInk = (inkSinistra + inkDestra) / 2;
      const centroBox = rb.left + rb.width / 2;
      const centroRicci = (Math.min(ri.left, rt.left) + Math.max(ri.right, rt.right)) / 2;
      out.push({
        testo: testoDi(testo).slice(0, 28),
        icona: glyph,
        lato: ri.left < rt.left ? 'davanti' : 'dietro',
        box: { sinistra: +rb.left.toFixed(2), larghe: +rb.width.toFixed(2), centro: +centroBox.toFixed(2) },
        iconaBox: { sinistra: +ri.left.toFixed(2), larghe: +ri.width.toFixed(2) },
        testoLarghe: +rt.width.toFixed(2),
        inkSinistra: +inkSinistra.toFixed(2),
        inkDestra: +inkDestra.toFixed(2),
        dxInk: +(centroInk - centroBox).toFixed(2),
        dxBox: +(centroRicci - centroBox).toFixed(2),
        marginLeftIcona: getComputedStyle(icona).marginLeft,
        gapRiga: getComputedStyle(icone[0].parentElement).gap,
      });
    }
    return out;
  }

  // ---- H3: righe con alignItems baseline ----
  function baseline(el) {
    const cs = getComputedStyle(el);
    const rng = document.createRange();
    rng.selectNodeContents(el);
    const rects = [...rng.getClientRects()];
    if (!rects.length) return null;
    const fm = metrics(fontOf(el));
    const lh = px(cs.lineHeight) || fm.lh;
    const prima = rects[0];
    return {
      baseline: +(prima.top + (lh - (fm.ascent + fm.descent)) / 2 + fm.ascent).toFixed(2),
      primaTop: +prima.top.toFixed(2),
      lh: +lh.toFixed(2),
      asc: +fm.ascent.toFixed(2),
      disc: +fm.descent.toFixed(2),
      righe: rects.length,
      fontSize: px(cs.fontSize),
      peso: cs.fontWeight,
    };
  }
  function righeBaseline() {
    const out = [];
    for (const el of document.querySelectorAll('div')) {
      const cs = getComputedStyle(el);
      if (cs.display !== 'flex' || cs.flexDirection !== 'row' || cs.alignItems !== 'baseline') continue;
      const f = figli(el);
      if (f.length < 2) continue;
      const misure = f.map((c) => ({ testo: testoDi(c).slice(0, 40), ...baseline(c) }));
      if (misure.some((m) => m === null)) continue;
      out.push({
        wrap: cs.flexWrap,
        justify: cs.justifyContent,
        gap: cs.gap,
        figli: misure,
        offset: +(misure[1].baseline - misure[0].baseline).toFixed(2),
      });
    }
    return out;
  }

  return {
    colonne: colonne(),
    bottoni: bottoniIcona(),
    baseline: righeBaseline(),
    tema: {
      sfondo: getComputedStyle(document.body).backgroundColor,
      colorScheme: document.documentElement.style.colorScheme,
    },
    link: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).slice(0, 60),
  };
})()
`;

/* ------------------------------------------------------------------ run */

/** La build statica serve ogni route gia' composta: si aspetta il testo della route. */
async function attendi(page, attesa, timeout = 20000) {
  await page.waitForFunction(
    (src) => {
      const t = document.body ? document.body.innerText : '';
      if (/Bundling|Preparazione di Baratto-lo/i.test(t)) return false;
      if (t.trim().length < 5) return false;
      return new RegExp(src, 'i').test(t);
    },
    attesa.source,
    { timeout, polling: 250 },
  );
}

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'commit', timeout: 60000 });
  await attendi(page, /acced|username/i);
  await page.waitForSelector('input', { timeout: 60000 });
  await page.fill('input[aria-label="Username"], input[type="text"]', USERNAME);
  await page.fill('input[aria-label="Password"], input[type="password"]', PASSWORD);
  await page.getByRole('button', { name: 'Accedi' }).first().click();
  await page.waitForFunction(() => !location.pathname.includes('/login'), null, { timeout: 30000 });
  await page.waitForTimeout(1200);
}

async function visita(page, rotta, cartella, stato) {
  const url = BASE + rotta.path;
  await page.goto(url, { waitUntil: 'commit', timeout: 60000 });
  let attesaOk = true;
  try {
    await attendi(page, rotta.attesa || /./);
  } catch {
    // la route non mostra cio' che ci si aspetta: si misura quel che c'e'
    attesaOk = false;
    await attendi(page, /./, 10000).catch(() => {});
  }
  if (!attesaOk) console.log(`  ~ ${rotta.nome}: attesa non soddisfatta (${rotta.attesa})`);
  // si misura la schermata caricata, non il suo stato di caricamento
  await page
    .waitForFunction(() => !/caric|preparazione/i.test(document.body.innerText || ''), null, {
      timeout: 15000,
      polling: 200,
    })
    .catch(() => {});
  await page.waitForTimeout(400);
  const dati = await page.evaluate(PROBE);
  const file = path.join(cartella, `${rotta.nome}${stato ? '-' + stato : ''}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  shot ${path.relative(process.cwd(), file)}`);
  return { dati, file };
}

function registra(vp, theme, rotta, dati, file) {
  risultati.pagine.push({ vp, theme, rotta, tema: dati.tema, file });
  risultati.h1.push({ vp, theme, rotta, file, ...dati.colonne });
  for (const b of dati.bottoni) risultati.h2.push({ vp, theme, rotta, file, ...b });
  for (const r of dati.baseline) {
    const firma = r.wrap + '|' + r.justify + '|' + r.figli.map((f) => f.fontSize).join(',');
    risultati.h3.push({ vp, theme, rotta, file, firma, ...r });
  }
  fs.writeFileSync(path.join(OUT, 'dati.json'), JSON.stringify(risultati, null, 1));
}

async function sweepAnonimo(browser, theme) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: theme,
    locale: 'it-IT',
  });
  const page = await context.newPage();
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const cartella = path.join(OUT, `${vp.nome}-${theme}`);
    fs.mkdirSync(cartella, { recursive: true });
    for (const r of [
      { path: '/login', nome: '12-login', attesa: /acced|username/i },
      { path: '/register', nome: '13-registrati', attesa: /crea il tuo profilo|registr/i },
      { path: '/pagina-che-non-esiste', nome: '14-non-trovata', attesa: /not found|non trovat/i },
    ]) {
      const t0 = Date.now();
      try {
        const { dati, file } = await visita(page, r, cartella, null);
        registra(vp.nome, theme, r.nome, dati, file);
        console.log(`  ok ${vp.nome}/${theme} ${r.nome} ${(Date.now() - t0) / 1000}s`);
      } catch (e) {
        console.log(`  !! ${r.nome} @${vp.nome}/${theme}: ${e.message.split('\n')[0]}`);
      }
    }
  }
  await context.close();
}

async function sweepAutenticato(browser, theme) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: theme,
    locale: 'it-IT',
  });
  const page = await context.newPage();
  await login(page);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const cartella = path.join(OUT, `${vp.nome}-${theme}`);
    fs.mkdirSync(cartella, { recursive: true });
    for (const rotta of ROTTE) {
      const t0 = Date.now();
      try {
        const { dati, file } = await visita(page, rotta, cartella, null);
        registra(vp.nome, theme, rotta.nome, dati, file);
        console.log(`  ok ${vp.nome}/${theme} ${rotta.nome} ${(Date.now() - t0) / 1000}s`);
        if (rotta.nome === '01-catalogo') {
          const u = (dati.link || []).find((h) => /^\/user\//.test(h));
          if (u) {
            const res = await visita(page, { path: u.replace(BASE, ''), nome: '08-utente', attesa: /./ }, cartella, null);
            registra(vp.nome, theme, '08-utente', res.dati, res.file);
          } else {
            console.log(`  -- 08-utente @${vp.nome}/${theme}: nessun link /user/ in pagina`);
          }
        }
        if (rotta.nome === '04-accordi') {
          const c = (dati.link || []).find((h) => /^\/chat\//.test(h));
          if (c) {
            try {
              const res = await visita(page, { path: c.replace(BASE, ''), nome: '09-chat', attesa: /./ }, cartella, null);
              registra(vp.nome, theme, '09-chat', res.dati, res.file);
            } catch (e) {
              console.log(`  -- 09-chat @${vp.nome}/${theme}: ${e.message.split('\n')[0]}`);
            }
          } else {
            console.log(`  -- 09-chat @${vp.nome}/${theme}: nessun link /chat/ in pagina`);
          }
        }
      } catch (e) {
        console.log(`  !! ${rotta.nome} @${vp.nome}/${theme}: ${e.message.split('\n')[0]}`);
      }
    }
  }

  // prova ottica di H2: ritaglio ingrandito di un bottone con icona
  for (const vp of [VIEWPORTS[2], VIEWPORTS[3]]) {
    const cartella = path.join(OUT, `${vp.nome}-${theme}`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE + '/offer-and-request', { waitUntil: 'commit', timeout: 60000 });
    try {
      await attendi(page, /elimina|sospendi|modifica/i);
      await page
        .waitForFunction(() => !/caric/i.test(document.body.innerText || ''), null, { timeout: 15000 })
        .catch(() => {});
      await page.waitForTimeout(400);
      const bottone = page.getByRole('button', { name: /Elimina/ }).first();
      const bb = await bottone.boundingBox();
      const f = path.join(cartella, '20-elimina-zoom.png');
      await page.screenshot({
        path: f,
        clip: { x: Math.max(0, bb.x - 24), y: Math.max(0, bb.y - 16), width: bb.width + 48, height: bb.height + 32 },
      });
      console.log(`  shot ${path.relative(process.cwd(), f)}`);
    } catch (e) {
      console.log(`  !! zoom @${vp.nome}/${theme}: ${e.message.split(String.fromCharCode(10))[0]}`);
    }
  }

  // stati: loading ed error sulla schermata di lettura, viewport stretta e larga
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const cartella = path.join(OUT, `${vp.nome}-${theme}`);
    await page.route('**/api/**', async (route) => {
      await new Promise((r) => setTimeout(r, 4000));
      try {
        await route.continue();
      } catch {
        // la richiesta e' gia' stata risolta o annullata: nessun difetto da misurare qui
      }
    });
    try {
      await page.goto(BASE + '/profile', { waitUntil: 'commit', timeout: 60000 });
      await page.waitForTimeout(1200);
      const f = path.join(cartella, '10-profilo-loading.png');
      await page.screenshot({ path: f, fullPage: false });
      registra(vp.nome, theme, '10-profilo-loading', await page.evaluate(PROBE), f);
    } catch (e) {
      console.log(`  !! loading @${vp.nome}/${theme}: ${e.message.split('\n')[0]}`);
    }
    await page.unroute('**/api/**');
    await page.route('**/api/**', (route) => route.abort().catch(() => {}));
    try {
      await page.goto(BASE + '/profile', { waitUntil: 'commit', timeout: 60000 });
      await page.waitForTimeout(2500);
      const f = path.join(cartella, '11-profilo-errore.png');
      await page.screenshot({ path: f, fullPage: false });
      registra(vp.nome, theme, '11-profilo-errore', await page.evaluate(PROBE), f);
    } catch (e) {
      console.log(`  !! errore @${vp.nome}/${theme}: ${e.message.split('\n')[0]}`);
    }
    await page.unroute('**/api/**');
    // vuoto: ricerca senza risultati sul catalogo
    try {
      await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 60000 });
      await attendi(page, /servizi/i);
      await page.waitForTimeout(1200);
      const campo = page.locator('input[type="text"], input:not([type])').first();
      await campo.fill('zzzznonesiste');
      await campo.press('Enter');
      await page.waitForTimeout(2500);
      const f = path.join(cartella, '15-catalogo-vuoto.png');
      await page.screenshot({ path: f, fullPage: false });
      registra(vp.nome, theme, '15-catalogo-vuoto', await page.evaluate(PROBE), f);
      console.log(`  shot ${path.relative(process.cwd(), f)}`);
    } catch (e) {
      console.log(`  !! vuoto @${vp.nome}/${theme}: ${e.message.split(String.fromCharCode(10))[0]}`);
    }
  }
  await context.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const theme of THEMES) {
    console.log(`== anonimo ${theme} ==`);
    await sweepAnonimo(browser, theme);
    console.log(`== autenticato ${theme} ==`);
    await sweepAutenticato(browser, theme);
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'dati.json'), JSON.stringify(risultati, null, 1));
  console.log(`\nscritto ${path.join(OUT, 'dati.json')}`);
})();

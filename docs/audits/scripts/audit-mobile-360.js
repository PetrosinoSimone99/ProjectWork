/**
 * Audit mobile 360 — la superficie che Windows puo' provare senza un iPhone.
 *
 * Gira su `npx expo serve dist` (build web statico) contro il backend Docker
 * reale. Tre profili di device:
 *   - iPhone SE   (375x667, WebKit  -> motore Safari, il caso piu' stretto)
 *   - iPhone 14 Pro (393x852, WebKit)
 *   - Pixel 7     (412x915, Chromium -> il lato Android)
 *
 * Per ogni schermata misura cio' che un audit deve misurare e che una
 * occhiata a caso non vede: overflow orizzontale, bersagli sotto i 44 pt,
 * contrasto reale dei testi, troncamenti, testi di caricamento rimasti a
 * schermo, nodi interattivi senza nome accessibile.
 *
 * Non prova: tastiera nativa, safe-area del notch, gesture, pull-to-refresh,
 * date picker, VoiceOver, performance. Quelle restano al device fisico.
 *
 * Uso:
 *   NODE_PATH=<npx-cache>/node_modules node docs/audits/scripts/audit-mobile-360.js [--full]
 */
const fs = require('fs');
const path = require('path');
const { webkit, chromium, devices } = require('playwright');

const BASE = 'http://localhost:8083';
const API = 'http://localhost:8000/api';
const USERNAME = 'giulia.bianchi';
const PASSWORD = 'demo1234';
const OUT = path.join(__dirname, '..', 'screens-mobile-2026-11-17');
const FULL = process.argv.includes('--full');

const PROFILI = [
  { nome: 'iphone-se', motore: 'webkit', device: devices['iPhone SE'], stretta: 375 },
  { nome: 'iphone-14-pro', motore: 'webkit', device: devices['iPhone 14 Pro'], stretta: 393 },
  { nome: 'pixel-7', motore: 'chromium', device: devices['Pixel 7'], stretta: 412 },
];

/** Solo le route che il server statico sa servire: le dinamiche si raggiungono cliccando. */
const ROTTE = [
  { path: '/', nome: '01-catalogo', attesa: 'Servizi' },
  { path: '/match', nome: '02-match', attesa: /coda/i },
  { path: '/offer-and-request', nome: '03-offro-e-cerco', attesa: /offro|cerco/i },
  { path: '/agreements', nome: '04-accordi', attesa: /accord/i },
  { path: '/profile', nome: '05-profilo', attesa: /profilo/i },
  { path: '/notifications', nome: '06-notifiche', attesa: /notific/i },
  { path: '/edit-profile', nome: '07-modifica-profilo', attesa: /profilo/i },
  { path: '/report', nome: '08-segnala', attesa: /segnal/i },
  { path: '/staff', nome: '09-staff', attesa: null },
  { path: '/staff-users', nome: '10-staff-utenti', attesa: null },
];

const ANONIME = [
  { path: '/login', nome: '11-login', attesa: /acced|entra|login/i },
  { path: '/register', nome: '12-registrati', attesa: /registr/i },
  { path: '/pagina-che-non-esiste', nome: '13-non-trovata', attesa: null },
];

const misure = [];
function nota(chiave, valore) {
  misure.push({ chiave, valore });
  console.log(`${chiave}: ${typeof valore === 'string' ? valore : JSON.stringify(valore)}`);
}

/* ------------------------------------------------------------------ sessione */

function ruoloDa(roles) {
  if (roles.includes('ROLE_STAFF')) return 'STAFF';
  if (roles.includes('ROLE_USER')) return 'USER';
  return null;
}

/** La sessione e' seminata con la forma esatta che scrive `token-store.js`. */
async function seedSession(page) {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const body = await response.json();
  if (!body.token) throw new Error(`login fallito: ${response.status}`);
  const roles = Array.isArray(body.user.roles) ? body.user.roles : [];
  const utente = {
    id: body.user.id,
    nome: body.user.name ?? '',
    cognome: body.user.surname ?? '',
    username: body.user.username ?? '',
    email: body.user.email ?? '',
    localita: body.user.location ?? null,
    ruoli: roles,
    ruolo: ruoloDa(roles),
    stato: body.user.accountStatus ?? null,
    bio: body.user.bio ?? null,
    immagineProfilo: body.user.profileImageUrl ?? null,
  };
  await page.addInitScript(
    ([token, json, scuro]) => {
      window.localStorage.setItem('barattolo.token', token);
      window.localStorage.setItem('barattolo.utente', json);
      if (scuro) window.localStorage.setItem('barattolo.tema', scuro);
    },
    [body.token, JSON.stringify(utente), null],
  );
}

/* ------------------------------------------------------------------- misure */

/** Il blocco di misura, iniettato: gira nella pagina, restituisce solo numeri. */
function sonda() {
  const visibile = (n) => {
    try {
      return n.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    } catch {
      return n.offsetParent !== null;
    }
  };
  const rect = (n) => n.getBoundingClientRect();
  const testo = (n) => (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);

  /* --- bersagli sotto i 44 pt (Apple HIG) --- */
  const selettoreInterattivo = [
    'button',
    'a',
    'input',
    'textarea',
    'select',
    '[tabindex="0"]',
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="radio"]',
    '[role="checkbox"]',
    '[role="switch"]',
    '[role="tab"]',
  ].join(',');
  const interattivi = [...document.querySelectorAll(selettoreInterattivo)].filter(visibile);
  const piccoli = interattivi
    .map((n) => {
      const r = rect(n);
      return {
        testo: n.getAttribute('aria-label') || testo(n) || n.getAttribute('placeholder') || n.tagName,
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
    .filter((o) => o.w > 0 && o.h > 0 && (o.w < 44 || o.h < 44));

  /* --- overflow orizzontale della pagina --- */
  const overflow = Math.max(0, document.body.scrollWidth - window.innerWidth);

  /* --- chi sfonda il viewport (e non e' un contenitore scrollabile) --- */
  const sfondano = [];
  const tutti = [...document.querySelectorAll('body *')].filter(visibile);
  for (const n of tutti) {
    const r = rect(n);
    if (r.width === 0) continue;
    if (r.right > window.innerWidth + 1 || r.left < -1) {
      let scorrevole = false;
      let p = n.parentElement;
      while (p) {
        const st = getComputedStyle(p);
        if (st.overflowX === 'auto' || st.overflowX === 'scroll') {
          scorrevole = true;
          break;
        }
        p = p.parentElement;
      }
      if (!scorrevole) {
        sfondano.push({
          nodo: n.tagName + (n.className ? '.' + String(n.className).split(' ')[0].slice(0, 24) : ''),
          testo: testo(n).slice(0, 40),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
    }
  }

  /* --- testi troncati --- */
  const troncati = [];
  for (const n of tutti) {
    if (n.children.length > 0) continue;
    if (!(n.textContent || '').trim()) continue;
    if (n.scrollWidth > n.clientWidth + 2 && n.clientWidth > 0) {
      troncati.push({ testo: testo(n), client: n.clientWidth, scroll: n.scrollWidth });
    }
  }

  /* --- contrasto reale: colore del testo contro lo sfondo effettivo --- */
  const rgb = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((v) => parseFloat(v));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const sfondoDi = (n) => {
    let p = n;
    while (p && p !== document.documentElement) {
      const st = getComputedStyle(p);
      if (st.backgroundImage && st.backgroundImage !== 'none') return null;
      const c = rgb(st.backgroundColor);
      if (c && c.a > 0.5) return c;
      p = p.parentElement;
    }
    const c = rgb(getComputedStyle(document.body).backgroundColor);
    return c && c.a > 0.5 ? c : { r: 255, g: 255, b: 255, a: 1 };
  };
  const contrasti = [];
  for (const n of tutti) {
    const haTestoDiretto = [...n.childNodes].some(
      (c) => c.nodeType === 3 && (c.textContent || '').trim(),
    );
    if (!haTestoDiretto) continue;
    const st = getComputedStyle(n);
    const colore = rgb(st.color);
    const sfondo = sfondoDi(n);
    if (!colore || !sfondo) continue;
    if (parseFloat(st.opacity) < 0.3) continue;
    const r = ratio(colore, sfondo);
    const pt = parseFloat(st.fontSize);
    const grande = pt >= 24 || (pt >= 18.66 && (st.fontWeight === '700' || st.fontWeight === 'bold'));
    const minimo = grande ? 3 : 4.5;
    if (r < minimo) {
      contrasti.push({
        testo: testo(n),
        ratio: Math.round(r * 100) / 100,
        minimo,
        pt: Math.round(pt),
        colore: st.color,
        sfondo: `rgb(${sfondo.r}, ${sfondo.g}, ${sfondo.b})`,
      });
    }
  }

  /* --- nome accessibile mancante --- */
  const senzaNome = interattivi
    .filter((n) => {
      const aria = n.getAttribute('aria-label') || n.getAttribute('aria-labelledby');
      const t = (n.textContent || '').trim();
      const ph = n.getAttribute('placeholder');
      const title = n.getAttribute('title');
      return !aria && !t && !ph && !title;
    })
    .map((n) => n.tagName + (n.getAttribute('role') ? `[role=${n.getAttribute('role')}]` : ''));

  /* --- immagini senza alt --- */
  const imgSenzaAlt = [...document.querySelectorAll('img')].filter(
    (n) => visibile(n) && !n.getAttribute('alt'),
  ).length;

  /* --- stati rimasti appesi --- */
  const caricamento = [...document.querySelectorAll('div,span,p')].filter(
    (n) => visibile(n) && /^(Caricamento|Carico)/.test((n.textContent || '').trim()),
  ).length;

  const h1 = [...document.querySelectorAll('h1')].filter(visibile).map((n) => testo(n));

  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    overflow,
    interattivi: interattivi.length,
    piccoli: piccoli.slice(0, 12),
    piccoliTotale: piccoli.length,
    sfondano: sfondano.slice(0, 8),
    sfondanoTotale: sfondano.length,
    troncati: troncati.slice(0, 8),
    troncatiTotale: troncati.length,
    contrasti: contrasti.sort((a, b) => a.ratio - b.ratio).slice(0, 12),
    contrastiTotale: contrasti.length,
    senzaNome: senzaNome.slice(0, 8),
    senzaNomeTotale: senzaNome.length,
    imgSenzaAlt,
    caricamento,
    h1,
  };
}

/**
 * Aspetta che la schermata abbia i dati, non solo il telaio: il backend in dev
 * impiega 2-4 s per chiamata, quindi un'attesa fissa misura il caricamento e
 * non il contenuto. Restituisce quanto ha aspettato, e se ha smesso di aspettare
 * per timeout (che e' a sua volta un dato: la schermata non si e' mai riempita).
 */
async function attendiContenuto(page, maxMs = 40000) {
  const inizio = Date.now();
  try {
    await page.waitForFunction(
      () => {
        const visibile = (n) => {
          try {
            return n.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
          } catch {
            return true;
          }
        };
        const appeso = [...document.querySelectorAll('div,span,p')].some(
          (n) => visibile(n) && /^(Carico|Caricamento)/.test((n.textContent || '').trim()),
        );
        return !appeso;
      },
      null,
      { timeout: maxMs, polling: 400 },
    );
    return { ok: true, ms: Date.now() - inizio };
  } catch {
    return { ok: false, ms: Date.now() - inizio };
  }
}

async function misuraPagina(page, etichetta, salva) {
  const attesa = await attendiContenuto(page);
  if (!attesa.ok) {
    nota(`${etichetta} ATTENZIONE`, `caricamento non finito dopo ${attesa.ms} ms`);
  }
  await page.waitForTimeout(400);
  const dati = await page.evaluate(sonda);
  dati.etichetta = etichetta;
  dati.attesaMs = attesa.ms;
  dati.attesaOk = attesa.ok;
  nota(`${etichetta}`, {
    overflow: dati.overflow,
    piccoli: `${dati.piccoliTotale}/${dati.interattivi}`,
    sfondano: dati.sfondanoTotale,
    troncati: dati.troncatiTotale,
    contrasti: dati.contrastiTotale,
    senzaNome: dati.senzaNomeTotale,
    caricamento: dati.caricamento,
    h1: dati.h1,
  });
  misure.dettagli = misure.dettagli || [];
  misure.dettagli.push(dati);
  if (salva) {
    await page.screenshot({
      path: path.join(OUT, `${etichetta}.png`),
      fullPage: true,
    });
  }
  return dati;
}

/* --------------------------------------------------------------- interazioni */

/** Esegue un passo fragile senza far cadere tutto l'audit. */
async function passo(nome, fn) {
  try {
    await fn();
    return true;
  } catch (err) {
    nota(`  passo fallito: ${nome}`, String(err.message).split('\n')[0].slice(0, 120));
    return false;
  }
}

async function goto(page, url) {
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
}

/* ---------------------------------------------------------------------- main */

async function auditProfilo(profilo) {
  const motore = profilo.motore === 'webkit' ? webkit : chromium;
  const browser = await motore.launch();
  const context = await browser.newContext({ ...profilo.device, locale: 'it-IT' });
  const page = await context.newPage();
  const errori = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errori.push(msg.text().slice(0, 160));
  });
  page.on('pageerror', (err) => errori.push(`pageerror: ${String(err.message).slice(0, 160)}`));

  const prefisso = profilo.nome;
  const completo = profilo.nome === 'iphone-14-pro' || FULL;

  await seedSession(page);

  /* --- le route che il server statico serve --- */
  for (const rotta of ROTTE) {
    const ok = await passo(`${prefisso}${rotta.path}`, async () => {
      await goto(page, rotta.path);
      await misuraPagina(page, `${prefisso}/${rotta.nome}`, completo);
    });
    if (!ok) nota(`${prefisso}${rotta.path}`, 'non caricata');
  }

  if (completo) {
    /* --- catalogo: filtro categoria, dettaglio servizio, ricerca --- */
    await passo('catalogo: interazioni', async () => {
      await goto(page, '/');
      await page.waitForTimeout(1500);
      const filtro = page.getByRole('button', { name: /categor|filtri/i }).first();
      if (await filtro.count()) {
        await filtro.click();
        await page.waitForTimeout(900);
        await misuraPagina(page, `${prefisso}/14-catalogo-filtro-categorie`, true);
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(400);
      }
      const card = page.locator('[role="button"], button').filter({ visible: true }).nth(3);
      if (await card.count()) {
        await card.click().catch(() => {});
        await page.waitForTimeout(1400);
        await misuraPagina(page, `${prefisso}/15-catalogo-dettaglio-servizio`, true);
      }
    });

    /* --- match: crea coda, conferma, annulla --- */
    await passo('match: crea e annulla coda', async () => {
      await goto(page, '/match');
      await page.waitForTimeout(2000);
      const crea = page
        .getByRole('button', { name: /Crea una coda per la tua offerta/i })
        .first();
      if (await crea.count()) {
        await crea.click();
        await page.waitForTimeout(2500);
        await misuraPagina(page, `${prefisso}/16-match-coda-creata`, true);
        const annulla = page.getByRole('button', { name: /Annulla questa coda/i }).first();
        if (await annulla.count()) {
          await annulla.click();
          await page.waitForTimeout(1000);
          await misuraPagina(page, `${prefisso}/17-match-conferma-annulla`, true);
          const si = page.getByRole('button', { name: /^(Annulla coda|Sì|Conferma)/i }).last();
          await si.click().catch(() => {});
          await page.waitForTimeout(2500);
          await misuraPagina(page, `${prefisso}/18-match-coda-annullata`, true);
        }
      }
    });

    /* --- accordi: filtro, scheda, chat --- */
    await passo('accordi: filtro e scheda', async () => {
      await goto(page, '/agreements');
      await page.waitForTimeout(2200);
      const inCorso = page.getByRole('radio', { name: /In corso/i }).first();
      if (await inCorso.count()) {
        await inCorso.click();
        await page.waitForTimeout(1500);
      }
      await misuraPagina(page, `${prefisso}/19-accordi-in-corso`, true);
      const apri = page.locator('[role="button"], button').filter({ visible: true });
      const n = await apri.count();
      let aperta = false;
      for (let i = 0; i < Math.min(n, 12) && !aperta; i += 1) {
        const el = apri.nth(i);
        const testo = ((await el.textContent()) || '').toLowerCase();
        if (/scheda|apri|dettag/i.test(testo)) {
          await el.click().catch(() => {});
          await page.waitForTimeout(1400);
          const heading = page.getByRole('heading', { name: /scheda|scambio/i });
          if (await heading.count()) {
            aperta = true;
            await misuraPagina(page, `${prefisso}/20-accordo-scheda`, true);
          }
        }
      }
      if (!aperta) nota(`${prefisso}/20-accordo-scheda`, 'scheda non aperta dai bottoni elencati');
    });

    /* --- notifiche: elimina con conferma --- */
    await passo('notifiche: elimina', async () => {
      await goto(page, '/notifications');
      await page.waitForTimeout(2200);
      await misuraPagina(page, `${prefisso}/21-notifiche`, true);
      const elimina = page.getByRole('button', { name: /Elimina questa notifica/i }).first();
      if (await elimina.count()) {
        await elimina.click();
        await page.waitForTimeout(1000);
        await misuraPagina(page, `${prefisso}/22-notifiche-conferma-elimina`, true);
        const no = page.getByRole('button', { name: /No, torna indietro/i }).first();
        if (await no.count()) {
          await no.click();
          await page.waitForTimeout(800);
        }
      } else {
        nota(`${prefisso}/22-notifiche-conferma-elimina`, 'nessun bottone Elimina visibile');
      }
    });

    /* --- offro e cerco: apri l'editor di una voce --- */
    await passo('offro-e-cerco: editor voce', async () => {
      await goto(page, '/offer-and-request');
      await page.waitForTimeout(2000);
      const modifica = page.getByRole('button', { name: /Modifica|Aggiungi|Crea/i }).first();
      if (await modifica.count()) {
        await modifica.click();
        await page.waitForTimeout(1400);
        await misuraPagina(page, `${prefisso}/23-voce-editor`, true);
      } else {
        nota(`${prefisso}/23-voce-editor`, 'nessun bottone di modifica trovato');
      }
    });

    /* --- profilo: selettore tema + dark --- */
    await passo('profilo: tema scuro', async () => {
      await goto(page, '/profile');
      await page.waitForTimeout(1800);
      const scuro = page.getByRole('radio', { name: /Scuro/i }).first();
      if (await scuro.count()) {
        await scuro.click();
        await page.waitForTimeout(1200);
      }
      await misuraPagina(page, `${prefisso}/24-profilo-scuro`, true);
      for (const rotta of [
        { p: '/', n: '25-catalogo-scuro' },
        { p: '/agreements', n: '26-accordi-scuro' },
        { p: '/notifications', n: '27-notifiche-scuro' },
        { p: '/match', n: '28-match-scuro' },
      ]) {
        await goto(page, rotta.p);
        await page.waitForTimeout(1600);
        await misuraPagina(page, `${prefisso}/${rotta.n}`, true);
      }
      const sistema = page.getByRole('radio', { name: /Sistema/i }).first();
      await goto(page, '/profile');
      if (await sistema.count()) await sistema.click().catch(() => {});
    });

    /* --- segnala: form aperto --- */
    await passo('segnala: form', async () => {
      await goto(page, '/report');
      await page.waitForTimeout(1600);
      await misuraPagina(page, `${prefisso}/29-segnala`, true);
    });
  }

  /* --- le schermate di autenticazione, in un contesto senza sessione --- */
  const anon = await browser.newContext({ ...profilo.device, locale: 'it-IT' });
  const paginaAnon = await anon.newPage();
  for (const rotta of ANONIME) {
    await passo(`${prefisso}${rotta.path}`, async () => {
      await paginaAnon.goto(BASE + rotta.path, { waitUntil: 'domcontentloaded' });
      await paginaAnon.waitForTimeout(1500);
      await misuraPagina(paginaAnon, `${prefisso}/${rotta.nome}`, completo);
    });
  }
  await passo('login: invio a vuoto', async () => {
    await paginaAnon.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
    await paginaAnon.waitForTimeout(1500);
    const submit = paginaAnon.getByRole('button', { name: /Accedi|Entra/i }).first();
    if (await submit.count()) {
      await submit.click();
      await paginaAnon.waitForTimeout(1200);
      await misuraPagina(paginaAnon, `${prefisso}/30-login-errori-vuoto`, true);
    }
  });
  await passo('registrati: invio a vuoto', async () => {
    await paginaAnon.goto(BASE + '/register', { waitUntil: 'domcontentloaded' });
    await paginaAnon.waitForTimeout(1500);
    const submit = paginaAnon.getByRole('button', { name: /Registrati|Crea/i }).first();
    if (await submit.count()) {
      await submit.click();
      await paginaAnon.waitForTimeout(1200);
      await misuraPagina(paginaAnon, `${prefisso}/31-registrati-errori-vuoto`, true);
    }
  });
  await anon.close();

  nota(`${prefisso}: errori console`, JSON.stringify([...new Set(errori)].slice(0, 6)));
  await browser.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const profilo of PROFILI) {
    console.log(`\n========== ${profilo.nome} ==========`);
    await auditProfilo(profilo);
  }
  const dettagli = misure.dettagli || [];
  delete misure.dettagli;
  fs.writeFileSync(
    path.join(OUT, 'misure.json'),
    JSON.stringify({ riepilogo: misure, dettagli }, null, 2),
    'utf8',
  );
  fs.writeFileSync(
    path.join(OUT, 'misure.txt'),
    misure.map((m) => `${m.chiave}: ${JSON.stringify(m.valore)}`).join('\n'),
    'utf8',
  );
  console.log(`\nscritto ${path.join(OUT, 'misure.json')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

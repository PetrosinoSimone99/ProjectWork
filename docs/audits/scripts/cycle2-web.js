/**
 * Web pass for cycle 2: the surfaces this cycle touched, on the exported web
 * build (`npx expo serve dist`), against the real Docker backend.
 *
 * Run with NODE_PATH pointing at a Playwright install:
 *   NODE_PATH=<npx-cache>/node_modules node docs/audits/scripts/cycle2-web.js
 *
 * It writes screenshots plus `measurements.txt` next to the audit it serves.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8083';
const API = 'http://localhost:8000/api';
const USERNAME = 'giulia.bianchi';
const PASSWORD = 'demo1234';
const OUT = path.join(__dirname, '..', 'screens-2026-11-15-cycle2');

const results = [];
function note(label, value) {
  results.push(`${label}: ${value}`);
  console.log(`${label}: ${value}`);
}

async function shot(page, name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`captured ${name}`);
}

/** The internal role word `normalizeAuthUser` derives from the wire roles. */
function ruoloDa(roles) {
  if (roles.includes('ROLE_STAFF')) {
    return 'STAFF';
  }
  if (roles.includes('ROLE_USER')) {
    return 'USER';
  }
  return null;
}

/**
 * The session is seeded straight into `localStorage` (`barattolo.token`,
 * `barattolo.utente`) with the shape `token-store.js` writes. The login form
 * against a cold PHP container sometimes exceeds the client's 10 s timeout, and
 * this pass measures the screens, not the login screen.
 */
async function seedSession(page) {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const body = await response.json();
  if (!body.token || !body.user) {
    throw new Error(`login failed: ${response.status} ${JSON.stringify(body)}`);
  }
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
    ([token, json]) => {
      window.localStorage.setItem('barattolo.token', token);
      window.localStorage.setItem('barattolo.utente', json);
    },
    [body.token, JSON.stringify(utente)],
  );
}

async function openMenu(page) {
  const menu = page.locator('[role="navigation"] [aria-expanded]').first();
  if ((await menu.getAttribute('aria-expanded')) !== 'true') {
    await menu.click();
    await page.waitForTimeout(300);
  }
}

async function go(page, label) {
  await openMenu(page);
  await page.getByRole('menuitem', { name: label }).first().click();
  await page.waitForTimeout(1200);
}

/**
 * The stack keeps previous screens mounted, so every "is it there?" question is
 * asked about a *visible* node: a hidden twin from an earlier visit would
 * satisfy a plain locator and hide a screen that never loaded.
 */
function visibile(locator) {
  return locator.filter({ visible: true }).first();
}

/** The one visible h1 of the screen on top, as text. */
async function visibleH1(page) {
  // `checkVisibility` rather than a bounding box: the web stack keeps the
  // previous screen laid out but invisible, so a box is not proof of presence.
  return page.evaluate(() =>
    [...document.querySelectorAll('h1')]
      .filter((node) => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
      .map((node) => node.textContent.trim()),
  );
}

/** Waits until no *visible* node says `testo` (the app's own loading lines). */
async function waitNoVisibleText(page, testo) {
  await page.waitForFunction(
    (atteso) =>
      ![...document.querySelectorAll('div')].some(
        (node) =>
          node.textContent === atteso &&
          node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
      ),
    testo,
    { timeout: 40000 },
  );
}

/** Waits until the screen has its data, not just its frame. */
async function waitScreen(page, nome) {
  if (nome === 'Match') {
    await visibile(page.getByRole('button', { name: 'Crea una coda per la tua offerta' })).waitFor({
      timeout: 40000,
    });
    await waitNoVisibleText(page, 'Caricamento…');
  }
  if (nome === 'Profilo') {
    await visibile(page.getByText('Il tuo profilo')).waitFor({ timeout: 40000 });
  }
  if (nome === 'Notifiche') {
    await waitNoVisibleText(page, 'Caricamento…');
    await page
      .locator('text=Nessuna notifica')
      .or(page.getByRole('button', { name: 'Elimina questa notifica' }).first())
      .first()
      .waitFor({ timeout: 40000 });
  }
  if (nome === 'Accordi') {
    await visibile(page.getByRole('radio', { name: /In corso/ })).waitFor({ timeout: 40000 });
    await waitNoVisibleText(page, 'Carico gli accordi…');
  }
}

async function themePreference(page, etichetta) {
  await go(page, 'Profilo');
  await page.getByRole('radio', { name: etichetta }).click();
  await page.waitForTimeout(600);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('console error:', msg.text().slice(0, 200));
    }
  });

  await seedSession(page);
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Servizi', exact: true }).waitFor({ timeout: 40000 });

  // --- Match tab: queues, gated create buttons, the credit line -------------
  await go(page, 'Match');
  await waitScreen(page, 'Match');
  note('match: visible h1', JSON.stringify(await visibleH1(page)));
  note('match: empty state', await page.getByText('Nessuna coda attiva').count());
  note('match: credit line', await page.getByText('Una coda di ricerca costa un credito.').count());
  note(
    'match: Offerta button disabled',
    await page.getByRole('button', { name: 'Crea una coda per la tua offerta' }).isDisabled(),
  );
  await shot(page, '01-match-light');

  await page.getByRole('button', { name: 'Crea una coda per la tua offerta' }).click();
  await page.getByText('Coda di offerta creata.').waitFor({ timeout: 20000 });
  await page.getByText('Annulla coda').first().waitFor({ timeout: 20000 });
  note('match: cancel buttons after create', await page.getByText('Annulla coda').count());
  await shot(page, '02-match-created');

  await page.getByRole('button', { name: 'Annulla questa coda' }).click();
  await page.getByRole('heading', { name: 'Annullare questa coda?' }).waitFor({ timeout: 8000 });
  await shot(page, '03-match-cancel-confirm');
  await page.getByRole('button', { name: 'Annulla coda', exact: true }).last().click();
  await page.getByText(/Coda annullata/).waitFor({ timeout: 20000 });
  await page.getByText('Nessuna coda attiva').waitFor({ timeout: 20000 });
  note('match: empty again', await page.getByText('Nessuna coda attiva').count());

  // --- Profile and inbox ---------------------------------------------------
  await go(page, 'Profilo');
  await waitScreen(page, 'Profilo');
  await page
    .getByText(/da leggere/)
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  note('profile: unread sentence', await page.getByText(/da leggere/).count());
  await shot(page, '04-profile-light');
  await page.getByRole('button', { name: /Apri le notifiche/ }).click();
  await page.getByRole('heading', { name: 'Notifiche' }).waitFor({ timeout: 20000 });
  await waitScreen(page, 'Notifiche');
  note('inbox: refresh sentence occurrences', await page.getByText(/arrivano quando riapri/).count());
  note(
    'inbox: unread dots',
    await page.evaluate(() => {
      return [...document.querySelectorAll('div')].filter((node) => {
        const style = getComputedStyle(node);
        return style.width === '8px' && style.height === '8px';
      }).length;
    }),
  );
  await shot(page, '05-inbox-light');

  // --- Agreements: the sheet card -----------------------------------------
  await go(page, 'Accordi');
  await waitScreen(page, 'Accordi');
  await page.getByRole('radio', { name: /In corso/ }).click().catch(() => {});
  await page.waitForTimeout(900);
  note('agreements: visible h1', JSON.stringify(await visibleH1(page)));
  note(
    'agreements: sheet titles',
    await page.getByText(/La tua scheda|La scheda di/).count(),
  );
  await shot(page, '06-agreements-sheet-light');

  // --- Dark ---------------------------------------------------------------
  await themePreference(page, 'Scuro');
  note(
    'dark: html color-scheme',
    await page.evaluate(() => document.documentElement.style.colorScheme),
  );
  await waitScreen(page, 'Profilo');
  await shot(page, '07-profile-dark');
  await go(page, 'Match');
  await waitScreen(page, 'Match');
  await shot(page, '08-match-dark');
  await go(page, 'Accordi');
  await waitScreen(page, 'Accordi');
  await page.getByRole('radio', { name: /In corso/ }).click().catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, '09-agreements-dark');
  await go(page, 'Profilo');
  await waitScreen(page, 'Profilo');
  await page.getByRole('button', { name: /Apri le notifiche/ }).click();
  await page.getByRole('heading', { name: 'Notifiche' }).waitFor({ timeout: 20000 });
  await waitScreen(page, 'Notifiche');
  note(
    'inbox dark: unread dot',
    await page.evaluate(() => {
      const dot = [...document.querySelectorAll('div')].find((node) => {
        const style = getComputedStyle(node);
        return style.width === '8px' && style.height === '8px';
      });
      return dot ? getComputedStyle(dot).backgroundColor : 'no dot found';
    }),
  );
  await shot(page, '10-inbox-dark');

  // --- Geometry and accessibility numbers ---------------------------------
  const geometry = await page.evaluate(() => {
    // The stack keeps previous screens mounted: only the elements with a box are
    // on screen, so the audit counts those (the earlier audits did the same).
    const visibile = (node) => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    const targets = [...document.querySelectorAll('button, a, [role="button"]')]
      .filter(visibile)
      .map((node) => node.getBoundingClientRect());
    const small = targets.filter((rect) => rect.width < 44 || rect.height < 44);
    const headings = [...document.querySelectorAll('h1')]
      .filter(visibile)
      .map((node) => node.textContent.trim());
    return {
      scrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      visibleH1: headings,
      targets: targets.length,
      smallTargets: small.length,
    };
  });
  note('geometry at 390 (inbox, dark)', JSON.stringify(geometry));

  await page.setViewportSize({ width: 1440, height: 900 });
  await go(page, 'Match');
  const wide = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  note('geometry at 1440 (match, dark)', JSON.stringify(wide));
  await shot(page, '11-match-1440-dark');

  await themePreference(page, 'Sistema');
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'measurements.txt'), results.join('\n'), 'utf8');
  console.log(`\n${results.join('\n')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

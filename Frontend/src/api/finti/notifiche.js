/**
 * Finti: le **notifiche in-app** dell'utente.
 *
 * Serve perché `notifiche.php` non esiste — e perché è l'unico modo in cui
 * l'utente scopre l'esito della propria segnalazione: **non** vede lo stato della
 * segnalazione, riceve questa notifica quando la staff chiude con un
 * provvedimento, e **niente** se la staff non prende provvedimenti (decisione del
 * titolare del 18 settembre 2026).
 *
 * È un `Map` per utente con copia su `localStorage` (chiave
 * `barattolo.finti.notifiche`): sul web una notifica non letta sopravvive al
 * reload, su native degrada a sola memoria — degradazione dichiarata. Il **seme è
 * «nessuna notifica»**: senza l'area staff (piano 11) non c'è nessun esito da
 * raccontare, e un avviso inventato all'avvio direbbe una cosa falsa.
 *
 * Chi **scrive** una notifica non è l'utente ma il finto della staff, con
 * `notificaEsito`: il piano 11 la chiama quando chiude una segnalazione, e se
 * l'esito assegna un token crea anche il buono nel deposito del piano 10
 * (`finti/token.js`, `assegnaToken`). Così la sceneggiatura della demo resta in un
 * posto solo e la schermata dell'utente non sa niente di come nasce.
 */

import { TIPI_NOTIFICA } from '@/servizi/notifiche';
import { adessoBackend } from './coda-dati';
import { assegnaToken } from './token';

const CHIAVE_PERSISTENZA = 'barattolo.finti.notifiche';

/** Attesa dichiarata: rende rappresentabile lo stato «guardo le notifiche». */
const ATTESA_MS = 300;

/**
 * Interruttore della prova: mettendo qui un `TIPI_NOTIFICA` (`'TOKEN_ASSEGNATO'`,
 * `'UTENTE_SOSPESO'`, `'UTENTE_BLOCCATO'`) compare **una notifica di prova**
 * all'apertura, per vedere l'avviso in-app — e il buono in «I miei token» nel
 * caso `TOKEN_ASSEGNATO` — **senza** l'area staff, che non esiste ancora. Non è
 * una funzione del prodotto: va riportato a `null` dopo la prova (la notifica
 * resta nel deposito, quindi si riparte pulendo `barattolo.finti.notifiche`).
 */
export const NOTIFICA_DI_PROVA = null;

/** Il deposito: `utenteId -> [riga di rete]`, dalla più recente. */
const deposito = new Map();

let caricato = false;

function localStorageDisponibile() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function leggiPersistito() {
  if (!localStorageDisponibile()) {
    return null;
  }
  try {
    const grezzo = window.localStorage.getItem(CHIAVE_PERSISTENZA);
    return grezzo ? JSON.parse(grezzo) : null;
  } catch (errore) {
    console.warn('Notifiche finte illeggibili: la demo riparte da zero.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  deposito.forEach((notifiche, utenteId) => {
    serializzabile[utenteId] = notifiche;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare le notifiche finte.', errore);
  }
}

function assicuraCaricato() {
  if (caricato) {
    return;
  }
  caricato = true;
  const salvato = leggiPersistito();
  if (!salvato || typeof salvato !== 'object') {
    return;
  }
  Object.entries(salvato).forEach(([utenteId, notifiche]) => {
    if (Array.isArray(notifiche)) {
      deposito.set(Number(utenteId), notifiche);
    }
  });
}

function notificheDepositate(utenteId) {
  assicuraCaricato();
  return deposito.get(Number(utenteId)) ?? [];
}

/** L'id continua dalla notifica più alta già presente, anche dopo un reload. */
function prossimoId() {
  let massimo = 0;
  deposito.forEach((notifiche) => {
    notifiche.forEach((notifica) => {
      massimo = Math.max(massimo, Number(notifica.id) || 0);
    });
  });
  return massimo + 1;
}

function scriviNotifiche(utenteId, notifiche) {
  deposito.set(Number(utenteId), notifiche);
  scriviPersistito();
}

function busta(message, data) {
  return { success: true, message, data };
}

/** Copia della riga: chi la riceve non può modificare quella del deposito. */
function copia(notifica) {
  return { ...notifica };
}

/** Il tipo di notifica che corrisponde a un esito della staff. */
const TIPO_PER_ESITO = {
  TOKEN_ASSEGNATO: TIPI_NOTIFICA.TOKEN_ASSEGNATO,
  UTENTE_SOSPESO: TIPI_NOTIFICA.UTENTE_SOSPESO,
  UTENTE_BLOCCATO: TIPI_NOTIFICA.UTENTE_BLOCCATO,
};

/**
 * Registra una notifica per un utente, in cima all'elenco (la più recente per
 * prima, come la si legge). Funzione **di servizio**, non un endpoint: la chiama
 * `notificaEsito`, e domani il finto della staff.
 */
export function registraNotifica(utenteId, { tipo, messaggio = null, idToken = null } = {}) {
  const riga = {
    id: prossimoId(),
    tipo: tipo ?? null,
    messaggio: typeof messaggio === 'string' ? messaggio : null,
    id_token: idToken,
    letta: false,
    creata_il: adessoBackend(),
  };
  scriviNotifiche(utenteId, [riga, ...notificheDepositate(utenteId)]);
  return copia(riga);
}

/**
 * La sceneggiatura della staff: chiusa una segnalazione con un **esito**, scrive
 * la notifica per il segnalante e — se l'esito è `TOKEN_ASSEGNATO` — crea il buono
 * nel deposito dei token, collegandolo alla notifica. Con un esito
 * `NESSUN_PROVVEDIMENTO` non scrive niente: è la decisione del titolare, «se la
 * staff non prende provvedimenti non arriva nessuna notifica».
 *
 * Non è chiamata da nessuna schermata di oggi: la usano il **piano 11** e
 * l'interruttore di prova qui sotto. Restituisce la notifica creata, o `null`.
 */
export function notificaEsito(utenteId, { esito, origineToken = null } = {}) {
  const tipo = TIPO_PER_ESITO[esito];
  if (!tipo) {
    return null;
  }
  const buono = tipo === TIPI_NOTIFICA.TOKEN_ASSEGNATO ? assegnaToken(utenteId, origineToken) : null;
  return registraNotifica(utenteId, {
    tipo,
    messaggio: 'La staff ha esaminato la segnalazione.',
    idToken: buono?.id ?? null,
  });
}

/** Materializza la notifica dell'interruttore di prova, una volta sola per utente. */
function semeDiProva(utenteId) {
  if (!NOTIFICA_DI_PROVA || notificheDepositate(utenteId).length > 0) {
    return;
  }
  notificaEsito(utenteId, { esito: NOTIFICA_DI_PROVA, origineToken: 'Prova della demo' });
}

/**
 * TODO(backend): `GET notifiche.php` → `{success, message, data:{notifiche:[{id,
 * tipo, messaggio, id_token, letta, creata_il}]}}` con le **proprie** notifiche
 * (l'identità dal token di accesso). `utenteId` serve perché il finto non
 * decodifica il token (su native `atob` non è garantito).
 */
export function ottieniNotifiche(utenteId) {
  semeDiProva(utenteId);
  const notifiche = notificheDepositate(utenteId).map(copia);
  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Notifiche caricate.', { notifiche })), ATTESA_MS);
  });
}

/**
 * TODO(backend): `POST notifiche.php {id}` con l'identità dal token di accesso;
 * `403` se la notifica non è mia, `404` se non esiste. Il finto non valida e
 * segna e basta: un `404` su un id che nel deposito non c'è.
 */
export function segnaNotificaLetta(utenteId, id) {
  const notifiche = notificheDepositate(utenteId);
  const aggiornate = notifiche.map((notifica) =>
    Number(notifica.id) === Number(id) ? { ...notifica, letta: true } : notifica,
  );
  scriviNotifiche(utenteId, aggiornate);
  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Notifica segnata come letta.')), ATTESA_MS);
  });
}

/** Svuota il deposito: comodo per riprovare la demo da zero. */
export function azzeraFinti() {
  deposito.clear();
  caricato = true;
  scriviPersistito();
}

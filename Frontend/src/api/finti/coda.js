/**
 * Finti: la coda e i gruppi di match (le catene dello swipe).
 *
 * Perché un file nuovo e non un allargamento di quelli che ci sono: `match.js` è
 * «i candidati e le scelte dello swipe», `servizi.js` è «il deposito delle
 * proprie voci», `catalogo.js` è «i servizi di tutti»; la coda e i gruppi sono
 * una **quarta** cosa. Questo file tiene il **deposito** e la **sceneggiatura**
 * della demo; quali membri esistono e come si compone il cerchio sta in
 * `coda-dati.js` (un'altra cosa: i dati, non il tempo che passa).
 *
 * Restituisce la **forma di rete** dell'endpoint proposto (`Match/coda.php`): la
 * normalizzazione è una sola e sta in `api/normalizzazioni.js`. Sul web il
 * deposito si appoggia a `localStorage` (chiave `barattolo.finti.coda`), così una
 * ricerca sopravvive al reload; su native degrada a sola memoria — degradazione
 * dichiarata. I finti **non validano**: un finto che rifiuta darebbe l'illusione
 * di un contratto che non esiste.
 *
 * Due cose dichiaratamente finte, che il backend vero deciderà:
 * - **quando parte la ricerca** (l'assunzione della demo, `DOPO_QUANTE_SCELTE`);
 * - **il tempo accelerato**: la ricerca dura minuti, non le 3 ore vere.
 */

import { ottieniScelte } from './match';
import {
  adessoBackend,
  gruppoAnnullato,
  gruppoInFormazione,
  gruppoPronto,
  storicoSeminato,
  uscitaDaMembro,
} from './coda-dati';

const CHIAVE_PERSISTENZA = 'barattolo.finti.coda';

/** Attesa dichiarata: rende rappresentabile lo stato «guardo la tua catena». */
const ATTESA_CODA_MS = 300;

/** Millisecondi di un minuto. */
const MS_PER_MINUTO = 60_000;

/**
 * Interruttore della demo: `'AUTO'` segue la sceneggiatura, gli altri valori
 * forzano uno stato (si ricarica la pagina e quello stato è subito a schermo).
 * **Non è una funzione del prodotto** e va ripristinato a `'AUTO'` dopo la prova.
 */
export const STATO_FINTO = 'AUTO'; // 'AUTO' | 'NESSUNO' | 'IN_FORMAZIONE' | 'PRONTO' | 'ANNULATO'

/** Tempi accelerati: la ricerca finta dura minuti, non le 3 ore vere (non confermate). */
const USA_TEMPI_ACCELERATI = true;
const DURATA_RICERCA_FINTA_MIN = 3;

/** Dopo quanti secondi (accelerati) scatta il ritiro simulato di un membro. */
const RITIRO_DOPO_SECONDI = 130;

/**
 * TODO(backend): il backend avvia la ricerca quando vuole — alla prima «Mi
 * interessa» non ricambiata, quando la pila finisce, o in un giro periodico. La
 * risposta del titolare («quando matchi») non dice *dopo quale* gesto: questa
 * costante è l'unico posto in cui la regola è scritta, come **assunzione della
 * demo**, non come una regola di prodotto.
 */
const DOPO_QUANTE_SCELTE = 1;

/** Il deposito: `utenteId -> stato`, nella forma interna (camelCase). */
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
    console.warn('Coda finta illeggibile: la demo riparte da zero.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  deposito.forEach((stato, utenteId) => {
    serializzabile[utenteId] = stato;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare la coda finta.', errore);
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
  Object.entries(salvato).forEach(([utenteId, stato]) => {
    if (stato && typeof stato === 'object') {
      deposito.set(Number(utenteId), stato);
    }
  });
}

function statoIniziale(utenteId) {
  return {
    inCoda: false,
    gruppo: null,
    storici: storicoSeminato(utenteId),
    scadenzaMs: null,
    avviataIl: null,
    interessiVisti: 0,
  };
}

function leggiStato(utenteId) {
  assicuraCaricato();
  const salvato = deposito.get(Number(utenteId));
  const base = statoIniziale(utenteId);
  if (!salvato || typeof salvato !== 'object') {
    return base;
  }
  return {
    inCoda: salvato.inCoda === true,
    gruppo: salvato.gruppo ?? null,
    storici: Array.isArray(salvato.storici) ? salvato.storici : base.storici,
    scadenzaMs: Number.isFinite(salvato.scadenzaMs) ? salvato.scadenzaMs : null,
    avviataIl: Number.isFinite(salvato.avviataIl) ? salvato.avviataIl : null,
    interessiVisti: Number.isFinite(salvato.interessiVisti) ? salvato.interessiVisti : 0,
  };
}

function scriviStato(utenteId, stato) {
  deposito.set(Number(utenteId), stato);
  scriviPersistito();
}

/** Quanti «Mi interessa» ha registrato l'utente: si leggono da `match.js`, senza scriverci. */
function quantiInteressi(utenteId) {
  return Object.values(ottieniScelte(utenteId)).filter((scelta) => scelta === 'INTERESSE').length;
}

/** Il fattore dei tempi accelerati: 1 in demo, 60 se un giorno si vuole il tempo «vero». */
function fattoreTempo() {
  return USA_TEMPI_ACCELERATI ? 1 : 60;
}

function durataRicercaMs() {
  return DURATA_RICERCA_FINTA_MIN * MS_PER_MINUTO * fattoreTempo();
}

/** La formazione in base al tempo trascorso: quanti membri e se la catena è chiusa. */
function formazionePerTempo(trascorsoSecondi) {
  const scala = fattoreTempo();
  const soglie = [
    { dopo: 70 * scala, quanti: 4, pronto: true },
    { dopo: 45 * scala, quanti: 3, pronto: false },
    { dopo: 20 * scala, quanti: 2, pronto: false },
    { dopo: 0, quanti: 1, pronto: false },
  ];
  return soglie.find((soglia) => trascorsoSecondi >= soglia.dopo) ?? soglie[soglie.length - 1];
}

/** Avanza la sceneggiatura di un passo e restituisce lo stato aggiornato. */
function avanza(utenteId) {
  let stato = leggiStato(utenteId);
  const interessi = quantiInteressi(utenteId);

  // Una ricerca è «attiva» finché è in formazione o pronta: un gruppo annullato
  // o concluso è finito e non blocca la ricerca successiva.
  const ricercaAttiva =
    stato.gruppo?.stato === 'IN_FORMAZIONE' || stato.gruppo?.stato === 'PRONTO';

  // La ricerca parte dalle scelte del Loop, e solo da un «Mi interessa» **nuovo**
  // rispetto all'ultima volta (altrimenti uscire la farebbe ripartire subito).
  // Se c'era un gruppo finito, prima passa nello storico.
  if (!ricercaAttiva && interessi > stato.interessiVisti && interessi >= DOPO_QUANTE_SCELTE) {
    const adesso = Date.now();
    const storici = stato.gruppo
      ? [{ ...stato.gruppo, concluso_il: adessoBackend() }, ...stato.storici]
      : stato.storici;
    stato = {
      ...stato,
      inCoda: true,
      gruppo: gruppoInFormazione(utenteId, 1),
      avviataIl: adesso,
      // Con **una** persona (io) non c'è ancora nessun match: il timer delle 3
      // ore non è partito. La scadenza nasce quando entra il secondo membro.
      scadenzaMs: null,
      interessiVisti: interessi,
      storici,
    };
  }

  // La formazione avanza nel tempo; alla soglia il ritiro simulato dichiara il
  // gruppo `ANNULATO` — che resta a schermo (vista «annullata») finché non
  // arriva una nuova «Mi interessa», che lo sposta nello storico e ne apre una.
  // Il ritiro vale anche da `PRONTO`: un membro può ritirarsi a cerchio chiuso.
  const attivaOra =
    stato.gruppo?.stato === 'IN_FORMAZIONE' || stato.gruppo?.stato === 'PRONTO';
  if (attivaOra) {
    const trascorso = (Date.now() - (stato.avviataIl ?? Date.now())) / 1000;
    if (trascorso >= RITIRO_DOPO_SECONDI * fattoreTempo()) {
      stato = { ...stato, inCoda: false, gruppo: gruppoAnnullato(utenteId) };
    } else {
      const formazione = formazionePerTempo(trascorso);
      // Il timer delle 3 ore **parte quando i primi due si incontrano e riparte
      // a ogni nuovo membro** (decisione del titolare del 17 settembre 2026):
      // da 2 a 3 e da 3 a 4. Prima del secondo membro non c'è nessuna scadenza.
      const quantiPrima = stato.gruppo.membri?.length ?? 0;
      const nuovoMembro = formazione.quanti > quantiPrima && formazione.quanti >= 2;
      stato = {
        ...stato,
        gruppo: formazione.pronto
          ? gruppoPronto(utenteId)
          : gruppoInFormazione(utenteId, formazione.quanti),
        ...(nuovoMembro ? { scadenzaMs: Date.now() + durataRicercaMs() } : {}),
      };
    }
  }

  scriviStato(utenteId, stato);
  return stato;
}

/** La vista di rete a partire dallo stato interno. */
function vistaRete(stato) {
  return {
    in_coda: stato.inCoda === true,
    scadenza:
      stato.gruppo && Number.isFinite(stato.scadenzaMs)
        ? new Date(stato.scadenzaMs).toISOString()
        : null,
    gruppo: stato.gruppo,
    gruppi_conclusi: stato.storici,
  };
}

/** Lo stato forzato dall'interruttore `STATO_FINTO`, senza toccare il deposito. */
function forzato(utenteId, quale) {
  const stato = leggiStato(utenteId);
  const base = { in_coda: false, scadenza: null, gruppo: null, gruppi_conclusi: stato.storici };
  const scadenza = new Date(Date.now() + durataRicercaMs()).toISOString();
  if (quale === 'IN_FORMAZIONE') {
    return { ...base, in_coda: true, scadenza, gruppo: gruppoInFormazione(utenteId, 3) };
  }
  if (quale === 'PRONTO') {
    return { ...base, scadenza, gruppo: gruppoPronto(utenteId) };
  }
  if (quale === 'ANNULATO') {
    return { ...base, gruppo: gruppoAnnullato(utenteId) };
  }
  return base;
}

function busta(message, data) {
  return { success: true, message, data };
}

/**
 * TODO(backend): `GET Match/coda.php` → `{success, message, data:{in_coda,
 * scadenza, gruppo, gruppi_conclusi}}`. `utenteId` serve perché il finto non
 * decodifica il token (su native `atob` non è garantito).
 */
export function ottieniCoda(utenteId) {
  const data = STATO_FINTO === 'AUTO' ? vistaRete(avanza(utenteId)) : forzato(utenteId, STATO_FINTO);
  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Coda caricata.', data)), ATTESA_CODA_MS);
  });
}

/**
 * TODO(backend): `POST Match/coda.php {azione:'esci'}` con l'identità **dal
 * token** e `409` se la ricerca è già finita. Il finto accetta sempre e chiude la
 * ricerca come `ANNULATO` con `uscita` = l'utente stesso, spostandola nello
 * storico.
 */
export function esciDallaCoda(utenteId) {
  const stato = leggiStato(utenteId);
  if (!stato.gruppo) {
    return new Promise((resolve) => {
      setTimeout(
        () => resolve(busta("Non c'era nessuna ricerca attiva.", { in_coda: false })),
        ATTESA_CODA_MS,
      );
    });
  }

  const mio = stato.gruppo.membri?.find((membro) => Number(membro.utente_id) === Number(utenteId));
  const chiuso = {
    ...stato.gruppo,
    stato: 'ANNULATO',
    uscita: uscitaDaMembro(mio, adessoBackend()),
    // Se esco io, non sono la parte danneggiata: nessun token.
    puoi_chiedere_token: false,
  };
  scriviStato(utenteId, {
    ...stato,
    inCoda: false,
    gruppo: null,
    storici: [{ ...chiuso, concluso_il: adessoBackend() }, ...stato.storici],
  });

  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Hai lasciato la ricerca.', { in_coda: false })), ATTESA_CODA_MS);
  });
}

/** Svuota il deposito (e riporta lo storico ai due casi seminati): prova la demo da zero. */
export function azzeraCodaFinta() {
  deposito.clear();
  caricato = true;
  scriviPersistito();
}

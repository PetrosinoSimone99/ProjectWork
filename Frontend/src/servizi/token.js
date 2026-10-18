/**
 * Il **buono** («token») e il suo ciclo di vita: la logica pura.
 *
 * Nome da non confondere: nel progetto «token» significa già il **token di
 * accesso** (`auth/token-store.js`, il Bearer di ogni chiamata). Qui è un'altra
 * cosa — il buono che dà diritto a **un servizio qualsiasi gratis**. I nomi
 * restano distinti: `token` nei parametri di rete è sempre quello di accesso,
 * mentre il buono è «buono» nei testi e nelle variabili locali, e `STATI_TOKEN`
 * descrive gli stati del *buono*. La distinzione era già raccomandata in
 * `temp/gruppo-3-mancanti/21`.
 *
 * Il ciclo è deciso (18 settembre 2026) e vive qui in un posto solo:
 * - il buono vale per **un servizio qualsiasi**, se ne possono avere più di uno
 *   e scade **un mese esatto** da quando è stato ottenuto;
 * - quando scegli il servizio diventa **impegnato** (`RESERVED`) e resta legato a
 *   quell'accordo;
 * - **si consuma** (`SPENT`) **quando l'accordo è concluso**, e a consumarlo è
 *   **il sistema**, non l'erogatore;
 * - se l'accordo **salta** (non si presenta, si annulla, si contesta) **torna
 *   disponibile** (`AVAILABLE`) e si può riusare;
 * - un buono `SPENT` o `EXPIRED` non si usa.
 *
 * Tre cose che questo modulo **non** fa, di proposito:
 * - **non deduce uno stato dalla data**: lo stato è quello che manda il backend,
 *   e `scaduto` è il booleano `expired` del server. L'unico calcolo è il residuo
 *   leggibile, che è un'informazione in più, non un esito;
 * - **non traduce uno stato ignoto**: passa così com'è e la schermata lo mostra
 *   **grezzo**, come fanno le catene con gli stati del ciclo di vita;
 * - **non implementa il consumo e il rilascio**: sono del sistema. Qui ci sono
 *   solo le domande che la schermata deve poter fare (sezioni, origine, azioni).
 *
 * Il formato delle date si **importa** da `@/servizi/catene` (`formattaDataOra`):
 * le date del contratto sono ISO (`DATE_ATOM`, es. `2026-10-18T10:12:00+00:00`)
 * e `formattaData` di `@/accordi/stati` le spezzerebbe sullo spazio restituendo
 * `null`. `formattaDataOra` è lo stesso formato che «Scambi» usa sullo stesso
 * campo (`scadeIl`, `scambi.jsx:389`): un solo import, nessuna libreria di date,
 * nessun rischio di import circolare (`catene.js` non importa questo modulo).
 *
 * Nessuna funzione muta i dati ricevuti: copia, trasforma, restituisce.
 */

import { formattaDataOra } from '@/servizi/catene';

/**
 * Gli stati del buono, quelli del **contratto reale** (`GET /api/tokens`).
 * La proposta della Parte 21 delle segnalazioni usava `DISPONIBILE`, `USATO`,
 * `SCADUTO`: la divergenza è **chiusa** — il backend manda `AVAILABLE`,
 * `RESERVED`, `SPENT` e, per i buoni scaduti, **`EXPIRED` come stato**
 * (riscrive già un `AVAILABLE` scaduto: `Backend/src/Service/TokenRedemptionService.php:114`).
 * Quindi `EXPIRED` è uno stato **noto**, con la sua etichetta, e non finisce mai
 * in «Altri buoni».
 */
export const STATI_TOKEN = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  SPENT: 'SPENT',
  EXPIRED: 'EXPIRED',
};

/** Etichette italiane degli stati. «Impegnato» dice cosa sta succedendo, non solo che non è libero. */
export const ETICHETTE_STATO_TOKEN = {
  [STATI_TOKEN.AVAILABLE]: 'Disponibile',
  [STATI_TOKEN.RESERVED]: 'Impegnato',
  [STATI_TOKEN.SPENT]: 'Usato',
  [STATI_TOKEN.EXPIRED]: 'Scaduto',
};

/** Le azioni ammesse su un buono, per la riga della card. Nomi, non stringhe sparse. */
export const AZIONI_BUONO = {
  USA: 'usa',
  ANNULLA: 'annulla',
  RICEVUTO: 'ricevuto',
};

/** Un giorno in millisecondi, per il residuo. */
const MS_PER_GIORNO = 86_400_000;

/** Uno stato in maiuscolo e ripulito, oppure `null` se manca o non è una stringa. */
function statoInMaiuscolo(valore) {
  const stato = typeof valore === 'string' ? valore.trim().toUpperCase() : '';
  return stato || null;
}

/**
 * Lo stato di un buono, in maiuscolo. `null` quando manca: la normalizzazione in
 * `api/aree/token.js` fa già questo lavoro, ma la logica pura non si fida del
 * chiamante (e serve a `raggruppaPerStato`).
 */
export function statoDelBuono(buono) {
  return statoInMaiuscolo(buono?.stato);
}

/**
 * L'etichetta di uno stato, oppure il **valore grezzo** se non lo conosciamo:
 * uno stato ignoto si mostra così com'è, invece di un «Non disponibile» che
 * sarebbe un esito inventato per omissione. `null` solo quando lo stato manca.
 */
export function etichettaStatoToken(stato) {
  const chiave = statoInMaiuscolo(stato);
  return chiave === null ? null : (ETICHETTE_STATO_TOKEN[chiave] ?? chiave);
}

/**
 * Il tono del chip, da tradurre nei colori del tema:
 * - `service` (verde): disponibile, il buono è utilizzabile;
 * - `accent` (ambra): impegnato, come la riga del token in «Scambi»;
 * - `danger`: scaduto, non vale più;
 * - `info` (neutro): usato e stati ignoti.
 * Il colore non è mai l'unico segnale: la parola sta accanto.
 */
export function tonoStatoToken(stato) {
  const chiave = typeof stato === 'string' ? stato.trim().toUpperCase() : '';
  if (chiave === STATI_TOKEN.AVAILABLE) {
    return 'service';
  }
  if (chiave === STATI_TOKEN.RESERVED) {
    return 'accent';
  }
  if (chiave === STATI_TOKEN.EXPIRED) {
    return 'danger';
  }
  return 'info';
}

/**
 * L'origine del buono, **derivata** da `chainId` (il contratto reale non ha il
 * motivo dell'assegnazione):
 * - `idCatena` valorizzato → `'Compensazione di una catena'`;
 * - `idCatena` nullo ma emesso → `'Assegnato dalla staff'`;
 * - entrambi nulli (buoni importati dal dump) → `null`, la riga non si mostra:
 *   non si inventa un motivo.
 */
export function descriviOrigine(buono) {
  if (buono?.idCatena !== null && buono?.idCatena !== undefined) {
    return 'Compensazione di una catena';
  }
  if (typeof buono?.emessoIl === 'string' && buono.emessoIl.trim() !== '') {
    return 'Assegnato dalla staff';
  }
  return null;
}

/**
 * Una data del backend in epoch (millisecondi), oppure `null` se assente o
 * illeggibile. Le date del contratto sono ISO (`2026-10-18T10:12:00+00:00`);
 * restano accettate anche le forme con lo spazio (`2026-10-18 10:12:00`) e solo
 * data usate altrove nel progetto.
 */
function aMs(valore) {
  if (typeof valore === 'number' && Number.isFinite(valore)) {
    return valore;
  }
  if (typeof valore !== 'string' || valore.trim() === '') {
    return null;
  }
  const millisecondi = Date.parse(valore.trim().replace(' ', 'T'));
  return Number.isFinite(millisecondi) ? millisecondi : null;
}

/**
 * Quanti giorni mancano alla scadenza: positivo se è nel futuro, `0` se scade
 * oggi, negativo se è passata. `null` quando la scadenza non c'è o non è
 * leggibile. Il conteggio è in **giorni interi** (arrotondati in su): è un
 * residuo leggibile, non una misura al secondo.
 */
export function giorniAllaScadenza(buono, adessoMs = Date.now()) {
  const scadenzaMs = aMs(buono?.scadeIl);
  if (scadenzaMs === null) {
    return null;
  }
  return Math.ceil((scadenzaMs - adessoMs) / MS_PER_GIORNO);
}

/**
 * Il residuo come testo: «mancano 12 giorni», «manca 1 giorno», «scade oggi».
 * `null` quando la data manca, non è leggibile o è **già passata**: in quel caso
 * non si scrive «scaduto», perché lo stato lo dice il backend e questa funzione
 * non lo deduce. `null` anche quando il server dice già `scaduto: true`, per non
 * mostrare un conto alla rovescia su un buono scaduto.
 */
export function testoResiduoToken(buono, adessoMs = Date.now()) {
  if (buono?.scaduto === true) {
    return null;
  }
  const giorni = giorniAllaScadenza(buono, adessoMs);
  if (giorni === null || giorni < 0) {
    return null;
  }
  if (giorni === 0) {
    return 'scade oggi';
  }
  return giorni === 1 ? 'manca 1 giorno' : `mancano ${giorni} giorni`;
}

/** La data di scadenza formattata (o `null`): usa lo stesso formato delle altre schermate. */
export function testoDataScadenza(buono) {
  return formattaDataOra(buono?.scadeIl);
}

/** La data di emissione formattata (o `null`). */
export function testoDataEmissione(buono) {
  return formattaDataOra(buono?.emessoIl);
}

/** La data d'uso formattata (o `null`), per i buoni `SPENT`. */
export function testoDataUso(buono) {
  return formattaDataOra(buono?.spesoIl);
}

/** Nella sezione «Disponibili»: `AVAILABLE` e non scaduto (il `scaduto` è del server). */
function eDisponibile(buono) {
  return statoDelBuono(buono) === STATI_TOKEN.AVAILABLE && buono?.scaduto !== true;
}

/**
 * Nella sezione «Scaduti»: stato `EXPIRED` **oppure** `AVAILABLE` scaduto — la
 * stessa cosa letta senza la riscrittura del backend (che di un `AVAILABLE`
 * scaduto fa già `EXPIRED`). Un `RESERVED` o `SPENT` scaduto **non** è qui:
 * resta nella sua sezione, perché un buono riservato si può ancora spendere.
 */
function eScaduto(buono) {
  const stato = statoDelBuono(buono);
  return (
    stato === STATI_TOKEN.EXPIRED ||
    (stato === STATI_TOKEN.AVAILABLE && buono?.scaduto === true)
  );
}

/**
 * Se il buono si può **impegnare** su un servizio: è nella sezione «Disponibili»
 * (solo `AVAILABLE` non scaduto). Uno stato ignoto non si impegna.
 */
export function puoEssereImpegnato(buono) {
  return eDisponibile(buono);
}

/** Se il buono è legato a un accordo in corso (`RESERVED`). */
export function eImpegnato(buono) {
  return statoDelBuono(buono) === STATI_TOKEN.RESERVED;
}

/**
 * Copia dei buoni con lo **stato del riscatto** collegato: lo `status` del
 * riscatto con `id` uguale a `idRiscatto`, in maiuscolo, `null` se il buono non
 * ha un riscatto o non è nell'elenco. Serve a decidere l'azione per riga
 * (`azioniDelBuono`). Gli array di ingresso **non** vengono mutati.
 */
export function conRiscatto(buoni, riscatti) {
  const elenco = Array.isArray(buoni) ? buoni : [];
  const perId = new Map(
    (Array.isArray(riscatti) ? riscatti : [])
      .filter((riscatto) => riscatto && riscatto.id !== null && riscatto.id !== undefined)
      .map((riscatto) => [riscatto.id, riscatto]),
  );
  return elenco.map((buono) => {
    const id = buono?.idRiscatto;
    const riscatto = id === null || id === undefined ? null : perId.get(id);
    return { ...buono, statoRiscatto: statoInMaiuscolo(riscatto?.stato) };
  });
}

/**
 * Le azioni ammesse sulla riga di un buono, secondo lo stato del server:
 * - «Disponibili» → `usa` (scegliere il servizio);
 * - `RESERVED` con riscatto `PENDING` → `annulla` (solo in attesa: dopo
 *   l'accettazione la UI non facilita l'annullamento, vedi `PLAN.md` decisione 6);
 * - `RESERVED` con riscatto `ACCEPTED` → `ricevuto`;
 * - `RESERVED` senza riscatto o con riscatto in stato ignoto → nessuna azione
 *   (un pulsante che fallirebbe a caso non si mostra);
 * - usati, scaduti e stati ignoti → nessuna azione.
 */
export function azioniDelBuono(buono) {
  if (eDisponibile(buono)) {
    return [AZIONI_BUONO.USA];
  }
  if (eImpegnato(buono)) {
    const riscatto = statoInMaiuscolo(buono?.statoRiscatto);
    if (riscatto === 'PENDING') {
      return [AZIONI_BUONO.ANNULLA];
    }
    if (riscatto === 'ACCEPTED') {
      return [AZIONI_BUONO.RICEVUTO];
    }
  }
  return [];
}

/**
 * I buoni divisi per stato, per le sezioni della schermata: `disponibili`,
 * `impegnati`, `usati` e `scaduti`. `altri` raccoglie gli stati **ignoti**
 * (veramente sconosciuti, non `EXPIRED`): devono restare visibili (mostrati
 * grezzi), non sparire in silenzio perché non li conosciamo.
 */
export function raggruppaPerStato(buoni) {
  const elenco = Array.isArray(buoni) ? buoni : [];
  const noti = new Set(Object.values(STATI_TOKEN));
  return {
    disponibili: elenco.filter(eDisponibile),
    impegnati: elenco.filter(eImpegnato),
    usati: elenco.filter((buono) => statoDelBuono(buono) === STATI_TOKEN.SPENT),
    scaduti: elenco.filter(eScaduto),
    altri: elenco.filter((buono) => !noti.has(statoDelBuono(buono))),
  };
}

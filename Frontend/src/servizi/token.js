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
 * - **non deduce uno stato dalla data**: lo stato è quello che manda il backend.
 *   L'unico calcolo è il residuo leggibile, che è un'informazione in più, non un
 *   esito (un `AVAILABLE` con la data passata resta `AVAILABLE` a schermo);
 * - **non traduce uno stato ignoto**: passa così com'è e la schermata lo mostra
 *   **grezzo**, come fa la coda con gli stati del gruppo;
 * - **non implementa il consumo e il rilascio**: sono del sistema. Qui ci sono
 *   solo le due domande che la schermata deve poter fare.
 *
 * Il formato delle date si **importa** da `@/accordi/stati` (`formattaData`) in sola lettura,
 * come già fa `servizi/coda.js` con `formattaDurata`: l'area 1:1 è in attesa di riscrittura e quel
 * prestito non la modifica — il giorno in cui si sposta, le due funzioni di formato finiscono in un
 * modulo condiviso.
 *
 * Nessuna funzione muta i dati ricevuti: copia, trasforma, restituisce.
 */

import { formattaData } from '@/accordi/stati';

/**
 * Gli stati del buono, quelli del **modello obiettivo**
 * (`Context_and_DB_V2/`, ripresi in `docs/10-architettura/database.md`).
 * La proposta della Parte 21 delle segnalazioni usava `DISPONIBILE`, `USATO`,
 * `SCADUTO`: i due insiemi **non coincidono** e la divergenza è segnalata ai
 * colleghi. Finché non decidono, valgono questi.
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

/** Un giorno in millisecondi, per il residuo. */
const MS_PER_GIORNO = 86_400_000;

/**
 * Lo stato di un buono, in maiuscolo. `null` quando manca: la normalizzazione in
 * `api/barattolo.js` fa già questo lavoro, ma la logica pura non si fida del
 * chiamante (e serve a `raggruppaPerStato`).
 */
export function statoDelBuono(buono) {
  const stato = typeof buono?.stato === 'string' ? buono.stato.trim().toUpperCase() : '';
  return stato || null;
}

/**
 * L'etichetta di uno stato, oppure il **valore grezzo** se non lo conosciamo:
 * uno stato ignoto si mostra così com'è, invece di un «Non disponibile» che
 * sarebbe un esito inventato per omissione. `null` solo quando lo stato manca.
 */
export function etichettaStatoToken(stato) {
  if (typeof stato !== 'string' || stato.trim() === '') {
    return null;
  }
  const chiave = stato.trim().toUpperCase();
  return ETICHETTE_STATO_TOKEN[chiave] ?? chiave;
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
 * L'origine del buono: il perché lo ha assegnato la staff. È una stringa del
 * backend e si mostra **così com'è**; se manca, la riga non si inventa (e la
 * schermata non la disegna, invece di scrivere un motivo plausibile).
 */
export function descriviOrigine(buono) {
  const testo = typeof buono?.origine === 'string' ? buono.origine.trim() : '';
  return testo || null;
}

/**
 * Una data del backend in epoch (millisecondi), oppure `null` se assente o
 * illeggibile. Accetta le tre forme che il progetto incontra: `2026-10-18
 * 10:12:00` (lo spazio del backend), `2026-10-18` e l'ISO con la `T`.
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
  const scadenzaMs = aMs(buono?.scadenza);
  if (scadenzaMs === null) {
    return null;
  }
  return Math.ceil((scadenzaMs - adessoMs) / MS_PER_GIORNO);
}

/**
 * Il residuo come testo: «mancano 12 giorni», «manca 1 giorno», «scade oggi».
 * `null` quando la data manca, non è leggibile o è **già passata**: in quel caso
 * non si scrive «scaduto», perché lo stato lo dice il backend e questa funzione
 * non lo deduce (un `AVAILABLE` con la data passata resta `AVAILABLE`).
 */
export function testoResiduoToken(buono, adessoMs = Date.now()) {
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
  return typeof buono?.scadenza === 'string' ? formattaData(buono.scadenza) : null;
}

/** La data di emissione formattata (o `null`). */
export function testoDataEmissione(buono) {
  return typeof buono?.creatoIl === 'string' ? formattaData(buono.creatoIl) : null;
}

/** La data d'uso formattata (o `null`), per i buoni `SPENT`. */
export function testoDataUso(buono) {
  return typeof buono?.usatoIl === 'string' ? formattaData(buono.usatoIl) : null;
}

/**
 * Se il buono si può **impegnare** su un servizio. Solo `AVAILABLE`: un buono
 * `SPENT` o `EXPIRED` non si usa, e un `RESERVED` è già legato a un accordo.
 * Uno stato ignoto non si impegna.
 */
export function puoEssereImpegnato(buono) {
  return statoDelBuono(buono) === STATI_TOKEN.AVAILABLE;
}

/**
 * Se il buono si può **spendere** su un servizio. Oggi è la stessa condizione
 * dell'impegno (l'impegno è il primo passo dell'uso), ma la schermata pone le due
 * domande in due punti diversi — l'azione sulla card e il filtro della sezione —
 * e una funzione sola decide, così non nascono due regole.
 */
export function puoiEssereUsato(buono) {
  return puoEssereImpegnato(buono);
}

/** Se il buono è legato a un accordo in corso (per mostrare la riga e nessuna azione). */
export function eImpegnato(buono) {
  return statoDelBuono(buono) === STATI_TOKEN.RESERVED;
}

/**
 * Il corpo della richiesta di impegno, nella forma di rete. Le chiavi sono quelle
 * proposte per `token.php` e il `// TODO(backend)` sta nel bivio di
 * `api/barattolo.js`: qui si costruisce una volta sola, come fa
 * `aPayloadPubblicazione` per le voci.
 */
export function aPayloadImpegno(idToken, idServizio) {
  return { azione: 'impegna', id_token: idToken, id_servizio: idServizio };
}

/**
 * I buoni divisi per stato, per le sezioni della schermata. `altri` raccoglie gli
 * stati **ignoti**: devono restare visibili (mostrati grezzi), non sparire in
 * silenzio perché non li conosciamo.
 */
export function raggruppaPerStato(buoni) {
  const elenco = Array.isArray(buoni) ? buoni : [];
  const perStato = (stato) => elenco.filter((buono) => statoDelBuono(buono) === stato);
  const noti = new Set(Object.values(STATI_TOKEN));
  return {
    disponibili: perStato(STATI_TOKEN.AVAILABLE),
    impegnati: perStato(STATI_TOKEN.RESERVED),
    usati: perStato(STATI_TOKEN.SPENT),
    scaduti: perStato(STATI_TOKEN.EXPIRED),
    altri: elenco.filter((buono) => !noti.has(statoDelBuono(buono))),
  };
}

/**
 * L'area staff: utenti, ruoli e stati — la logica pura.
 *
 * È il sesto modulo di dominio, accanto a `offerta-ricerca.js`, `candidati.js`,
 * `coda.js`, `segnalazioni.js` e `staff.js`. Qui c'è quello che serve alla
 * schermata degli utenti: i valori ammessi, le etichette, i toni, il filtro
 * locale della ricerca, la forma di rete dei due comandi e **le regole di
 * autorizzazione come funzioni pure della UI**.
 *
 * Tre cose da sapere, perché sono la ragione per cui il modulo esiste:
 * - **i permessi non si inventano, si replicano.** Le funzioni
 *   `motivoRifiutoRuolo` e `motivoRifiutoStato` riscrivono, caso per caso, i
 *   controlli di `API/userRoleManager.php:100-137` e
 *   `API/userStatoManager.php:100-137`, verificati dal database e riassunti
 *   nella tabella di `docs/20-contratti-api/accesso-utenti.md:327-345`.
 *   L'asimmetria è voluta e va conservata: un `ADMIN` può cambiare il **ruolo**
 *   di un altro `ADMIN`, ma **non** il suo **stato**.
 * - **la UI non protegge niente.** Queste funzioni servono a non disegnare un
 *   comando che il server rifiuterebbe; a decidere resta il backend, e ogni
 *   `403` è un caso da mostrare, non un errore da nascondere.
 * - **i valori sono quelli del database**, non quelli proposti dal documento dei
 *   colleghi: il ruolo è `UTENTE|STAFF|ADMIN` e lo stato è
 *   `ATTIVO|SOSPESO|BLOCCATO` (vedi `docs/10-architettura/database.md`,
 *   tabella `utenti`). Un valore ignoto si mostra **grezzo**, non tradotto a
 *   caso.
 *
 * Le funzioni sono pure: copiano, trasformano, restituiscono, e non mutano mai
 * la riga ricevuta.
 */

import { nomePersona } from './offerta-ricerca';

/** I ruoli ammessi dal backend (`userRoleManager.php`: `$ruoliConsentiti`). */
export const RUOLI = ['UTENTE', 'STAFF', 'ADMIN'];

/** Gli stati ammessi dal backend (`userStatoManager.php`: `$statiConsentiti`). */
export const STATI_UTENTE = ['ATTIVO', 'SOSPESO', 'BLOCCATO'];

/** I due comandi della riga, con le stesse chiavi delle `azioni` della card. */
export const AZIONI_UTENTE = {
  RUOLO: 'ruolo',
  STATO: 'stato',
};

/** Le etichette italiane dei ruoli; un ruolo ignoto resta grezzo. */
export const ETICHETTE_RUOLO = {
  UTENTE: 'Utente',
  STAFF: 'Staff',
  ADMIN: 'Amministratore',
};

/** Le etichette italiane degli stati; uno stato ignoto resta grezzo. */
export const ETICHETTE_STATO_UTENTE = {
  ATTIVO: 'Attivo',
  SOSPESO: 'Sospeso',
  BLOCCATO: 'Bloccato',
};

/** I toni dei chip, gli stessi nomi usati da `components/ChipTono.jsx`. */
const TONI_RUOLO = { UTENTE: 'info', STAFF: 'service', ADMIN: 'accent' };
const TONI_STATO_UTENTE = { ATTIVO: 'success', SOSPESO: 'accent', BLOCCATO: 'danger' };

/** Il valore in maiuscolo senza spazi, oppure `null` se assente. */
function chiave(valore) {
  if (typeof valore !== 'string' || valore.trim() === '') {
    return null;
  }
  return valore.trim().toUpperCase();
}

/** `true` se operatore e bersaglio sono due utenti diversi con un id. */
function sonoDuePersone(io, bersaglio) {
  if (!io || !bersaglio) {
    return false;
  }
  if (io.id === null || io.id === undefined || bersaglio.id === null || bersaglio.id === undefined) {
    return false;
  }
  return Number(io.id) !== Number(bersaglio.id);
}

/**
 * Il motivo per cui il **ruolo** del bersaglio non si può cambiare, oppure `null`
 * se il backend lo permetterebbe. I testi sono quelli di
 * `API/userRoleManager.php` (che li manda nel campo `errore`, mostrato tale e
 * quale dal `Banner`).
 */
export function motivoRifiutoRuolo(io, bersaglio, nuovoRuolo) {
  const ruoloIo = chiave(io?.ruolo);
  if (ruoloIo !== 'STAFF' && ruoloIo !== 'ADMIN') {
    return 'Non hai i permessi per gestire i ruoli degli utenti.';
  }
  if (!sonoDuePersone(io, bersaglio)) {
    return 'Non puoi modificare il tuo ruolo con questa API.';
  }
  if (ruoloIo === 'STAFF' && chiave(bersaglio.ruolo) !== 'UTENTE') {
    return 'Lo STAFF può gestire solo utenti con ruolo UTENTE.';
  }
  if (ruoloIo === 'STAFF' && chiave(nuovoRuolo) === 'ADMIN') {
    return 'Lo STAFF non può assegnare il ruolo ADMIN.';
  }
  if (!RUOLI.includes(chiave(nuovoRuolo))) {
    return 'Ruolo non valido. Usa UTENTE, STAFF o ADMIN.';
  }
  return null;
}

/**
 * Il motivo per cui lo **stato** del bersaglio non si può cambiare, oppure
 * `null`. I testi sono quelli di `API/userStatoManager.php`. La differenza
 * dall'endpoint gemello sta nella riga sul bersaglio `ADMIN`: per lo stato è
 * vietato anche a un altro `ADMIN` (asimmetria dichiarata in
 * `accesso-utenti.md`).
 */
export function motivoRifiutoStato(io, bersaglio) {
  const ruoloIo = chiave(io?.ruolo);
  if (ruoloIo !== 'STAFF' && ruoloIo !== 'ADMIN') {
    return 'Non hai i permessi per gestire lo stato degli utenti.';
  }
  if (!sonoDuePersone(io, bersaglio)) {
    return 'Non puoi modificare il tuo stato con questa API.';
  }
  if (chiave(bersaglio.ruolo) === 'ADMIN') {
    return "Non puoi modificare lo stato di un amministratore.";
  }
  if (ruoloIo === 'STAFF' && chiave(bersaglio.ruolo) !== 'UTENTE') {
    return 'Lo STAFF può gestire solo utenti con ruolo UTENTE.';
  }
  return null;
}

/** I ruoli che chi guarda può assegnare **a questo** bersaglio (vuoto se nessuno). */
export function ruoliAssegnabili(io, bersaglio) {
  return RUOLI.filter((ruolo) => motivoRifiutoRuolo(io, bersaglio, ruolo) === null);
}

/** Gli stati che chi guarda può assegnare a questo bersaglio, escluso quello attuale. */
export function statiAssegnabili(io, bersaglio) {
  if (motivoRifiutoStato(io, bersaglio) !== null) {
    return [];
  }
  const attuale = chiave(bersaglio?.stato);
  return STATI_UTENTE.filter((stato) => stato !== attuale);
}

/**
 * `true` se il ruolo del bersaglio può essere cambiato. `nuovoRuolo` è
 * facoltativo: senza, si chiede solo se **esiste** un ruolo assegnabile diverso
 * da quello che la persona ha già — è la domanda che la card si fa prima di
 * disegnare il comando.
 */
export function puoCambiareRuolo(io, bersaglio, nuovoRuolo) {
  if (nuovoRuolo === undefined) {
    const attuale = chiave(bersaglio?.ruolo);
    return ruoliAssegnabili(io, bersaglio).some((ruolo) => ruolo !== attuale);
  }
  return motivoRifiutoRuolo(io, bersaglio, nuovoRuolo) === null;
}

/** `true` se lo stato del bersaglio può essere cambiato. */
export function puoCambiareStato(io, bersaglio) {
  return statiAssegnabili(io, bersaglio).length > 0;
}

/**
 * I comandi da disegnare sulla riga: un sottoinsieme di `AZIONI_UTENTE`. È
 * l'unico posto in cui la card chiede cosa mostrare, così la regola e il
 * disegno non possono divergere.
 */
export function azioniConsentite(io, bersaglio) {
  const azioni = [];
  if (puoCambiareRuolo(io, bersaglio)) {
    azioni.push(AZIONI_UTENTE.RUOLO);
  }
  if (puoCambiareStato(io, bersaglio)) {
    azioni.push(AZIONI_UTENTE.STATO);
  }
  return azioni;
}

/** Il ruolo in maiuscolo senza spazi, oppure `null` se assente. */
export function normalizzaRuolo(valore) {
  return chiave(valore);
}

/** Lo stato in maiuscolo senza spazi, oppure `null` se assente. */
export function normalizzaStatoUtente(valore) {
  return chiave(valore);
}

/** L'etichetta di un ruolo, oppure `null` se il valore è assente. */
export function etichettaRuolo(ruolo) {
  const valore = chiave(ruolo);
  if (valore === null) {
    return null;
  }
  return ETICHETTE_RUOLO[valore] ?? valore;
}

/** L'etichetta di uno stato, oppure `null` se il valore è assente. */
export function etichettaStatoUtente(stato) {
  const valore = chiave(stato);
  if (valore === null) {
    return null;
  }
  return ETICHETTE_STATO_UTENTE[valore] ?? valore;
}

/** Il tono del chip del ruolo (`ChipTono`); un ruolo ignoto resta neutro. */
export function tonoRuolo(ruolo) {
  return TONI_RUOLO[chiave(ruolo)] ?? 'info';
}

/** Il tono del chip dello stato; uno stato ignoto resta neutro. */
export function tonoStatoUtente(stato) {
  return TONI_STATO_UTENTE[chiave(stato)] ?? 'info';
}

/** `Nome Cognome (@username)`, con quello che c'è: `@username` solo se esiste. */
export function descriviUtente(utente) {
  const username = typeof utente?.username === 'string' ? utente.username.trim() : '';
  const nome = nomePersona(utente);
  return username === '' ? nome : `${nome} (@${username})`;
}

/** La frase di conferma del cambio di ruolo: dice **cosa** cambia e **per chi**. */
export function descriviCambioRuolo(bersaglio, nuovoRuolo) {
  return (
    `Cambiare il ruolo di ${nomePersona(bersaglio)} ` +
    `da ${etichettaRuolo(bersaglio?.ruolo) ?? 'sconosciuto'} a ${etichettaRuolo(nuovoRuolo)}.`
  );
}

/** La frase di conferma del cambio di stato. */
export function descriviCambioStato(bersaglio, nuovoStato) {
  return (
    `Cambiare lo stato di ${nomePersona(bersaglio)} ` +
    `da ${etichettaStatoUtente(bersaglio?.stato) ?? 'sconosciuto'} a ` +
    `${etichettaStatoUtente(nuovoStato)}.`
  );
}

/**
 * Il filtro della ricerca, **locale e dichiarato**: nome, cognome e username,
 * senza distinguere maiuscole. Ruolo e stato confrontano i valori in maiuscolo,
 * così un filtro non resta vuoto per una differenza di forma. `null` significa
 * «nessun filtro».
 */
export function filtraUtenti(utenti, ricerca = '', ruolo = null, stato = null) {
  if (!Array.isArray(utenti)) {
    return [];
  }
  const testo = typeof ricerca === 'string' ? ricerca.trim().toLowerCase() : '';
  const ruoloCercato = chiave(ruolo);
  const statoCercato = chiave(stato);

  return utenti.filter((utente) => {
    if (ruoloCercato !== null && chiave(utente?.ruolo) !== ruoloCercato) {
      return false;
    }
    if (statoCercato !== null && chiave(utente?.stato) !== statoCercato) {
      return false;
    }
    if (testo === '') {
      return true;
    }
    return [utente?.nome, utente?.cognome, utente?.username].some(
      (campo) => typeof campo === 'string' && campo.toLowerCase().includes(testo),
    );
  });
}

/** Il corpo di `userRoleManager.php`: `{utente_id, ruolo}`. */
export function aPayloadRuolo(id, ruolo) {
  return { utente_id: Number(id), ruolo: chiave(ruolo) };
}

/** Il corpo di `userStatoManager.php`: `{utente_id, stato}`. */
export function aPayloadStato(id, stato) {
  return { utente_id: Number(id), stato: chiave(stato) };
}

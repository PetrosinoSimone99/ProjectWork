import { formattaDurata } from '@/accordi/stati';
import { nomePersona } from './offerta-ricerca';

/**
 * Le catene: la logica **pura** del dominio, accanto a `candidati.js` e
 * `offerta-ricerca.js`. Qui ci sono gli stati del ciclo di vita del contratto
 * reale (`POST|GET /api/chains`, PR #29), le viste della schermata, la
 * composizione dell'orario di inizio delle condizioni e i testi accessibili.
 *
 * Tre cose che questo modulo **non** fa, di proposito:
 * - **non calcola la catena**: i versi arrivano dichiarati da `links`
 *   (`providerUserId → recipientUserId`); senza quel verso non si disegna
 *   nessuna freccia e non si deduce niente;
 * - **non calcola una scadenza**: le scadenze sono dati del backend (stringhe
 *   ISO, più gli epoch per il conto alla rovescia); a zero parte una rilettura,
 *   mai un esito scritto qui;
 * - **non traduce a caso**: uno stato o un motivo **ignoto** si mostrano
 *   **grezzi** (vista `NEUTRA`), con la frase che questa versione non li conosce.
 *
 * Gli helper `testoTempoResiduo`, `formattaOra` sono **spostati** da
 * `servizi/coda.js` (rimozione, mai duplicazione): nessun altro modulo li
 * dichiarava. `formattaDurata` arriva da `@/accordi/stati` in sola lettura,
 * come già faceva la coda.
 *
 * Nessuna funzione muta i dati ricevuti: copia, trasforma, restituisce.
 */

/** Gli stati della catena, verbatim dal contratto (`ChainService::serialize`). */
export const STATI_CATENA = {
  IN_RICERCA: 'SEARCHING',
  IN_CONFERME: 'AWAITING_CONFIRMATIONS',
  CONFERMATA: 'CONFIRMED',
  COMPLETATA: 'COMPLETED',
  ANNULLATA: 'CANCELLED',
};

/** Etichette italiane degli stati: dicono cosa sta succedendo, non solo che «è». */
export const ETICHETTE_STATO_CATENA = {
  [STATI_CATENA.IN_RICERCA]: 'In ricerca',
  [STATI_CATENA.IN_CONFERME]: 'In attesa delle conferme',
  [STATI_CATENA.CONFERMATA]: 'Confermata',
  [STATI_CATENA.COMPLETATA]: 'Completata',
  [STATI_CATENA.ANNULLATA]: 'Saltata',
};

/** Tono del chip: verde solo quando la catena è conclusa bene. */
export function tonoStatoCatena(stato) {
  return stato === STATI_CATENA.COMPLETATA ? 'service' : 'info';
}

/**
 * L'etichetta dello stato, oppure il **valore grezzo** se non lo conosciamo.
 * `null` solo quando lo stato manca del tutto.
 */
export function etichettaStatoCatena(stato) {
  if (typeof stato !== 'string' || stato.trim() === '') {
    return null;
  }
  const chiave = stato.trim().toUpperCase();
  return ETICHETTE_STATO_CATENA[chiave] ?? chiave;
}

/** I motivi di annullamento **noti** del ciclo di vita (campo `cancellationReason`). */
export const MOTIVI_ANNULLAMENTO = {
  RICERCA_SCADUTA: 'SEARCH_EXPIRED',
  CONFERME_SCADUTE: 'CONFIRMATION_EXPIRED',
  MATCH_DIRETTO: 'DIRECT_PATH_AVAILABLE',
  PARTECIPANTE_HA_RIFIUTATO: 'PARTICIPANT_REJECTED',
  SERVIZI_INIZIALI_NON_DISPONIBILI: 'INITIAL_SERVICES_UNAVAILABLE',
};

/** Etichette italiane dei motivi noti. Il testo libero resta com'è. */
export const ETICHETTE_MOTIVO_ANNULLAMENTO = {
  [MOTIVI_ANNULLAMENTO.RICERCA_SCADUTA]: 'La ricerca è scaduta',
  [MOTIVI_ANNULLAMENTO.CONFERME_SCADUTE]: 'Le conferme sono scadute',
  [MOTIVI_ANNULLAMENTO.MATCH_DIRETTO]: 'È comparso un match diretto',
  [MOTIVI_ANNULLAMENTO.PARTECIPANTE_HA_RIFIUTATO]: 'Rifiuto di un partecipante',
  [MOTIVI_ANNULLAMENTO.SERVIZI_INIZIALI_NON_DISPONIBILI]: 'I servizi di partenza non sono più disponibili',
};

/**
 * L'etichetta del motivo: italiana per i cinque valori noti, **grezza** per
 * tutto il resto (anche per il testo libero di `POST /cancel`, che resta
 * com'è — è già leggibile per definizione). `null` quando manca.
 */
export function etichettaMotivoAnnullamento(motivo) {
  if (typeof motivo !== 'string' || motivo.trim() === '') {
    return null;
  }
  const chiave = motivo.trim().toUpperCase();
  return ETICHETTE_MOTIVO_ANNULLAMENTO[chiave] ?? motivo.trim();
}

/** Gli stati delle condizioni di un arco (gli `agreements` del contratto). */
export const STATI_CONDIZIONI = {
  IN_ATTESA: 'PENDING',
  ACCETTATE: 'ACCEPTED',
  RIFIUTATE: 'REJECTED',
};

export const ETICHETTE_STATO_CONDIZIONI = {
  [STATI_CONDIZIONI.IN_ATTESA]: 'In attesa',
  [STATI_CONDIZIONI.ACCETTATE]: 'Accettate',
  [STATI_CONDIZIONI.RIFIUTATE]: 'Rifiutate',
};

/** Stato delle condizioni con ignoto **grezzo**. */
export function etichettaStatoCondizioni(stato) {
  if (typeof stato !== 'string' || stato.trim() === '') {
    return null;
  }
  const chiave = stato.trim().toUpperCase();
  return ETICHETTE_STATO_CONDIZIONI[chiave] ?? chiave;
}

/** Le decisioni della UI, tradotte nel vocabolario del contratto **solo qui**. */
export const DECISIONI_CATENA = { ACCETTA: 'ACCETTA', RIFIUTA: 'RIFIUTA' };

/** La decisione di conferma nella forma del contratto, o `null` se ignota. */
export function decisioneAlContratto(decisione) {
  if (decisione === DECISIONI_CATENA.ACCETTA) {
    return 'ACCEPT';
  }
  if (decisione === DECISIONI_CATENA.RIFIUTA) {
    return 'REJECT';
  }
  return null;
}

/** Il chip della decisione di un partecipante: legge il valore **grezzo**. */
export function etichettaDecisione(decisione) {
  if (decisione === 'ACCEPT') {
    return 'ha accettato';
  }
  if (decisione === 'REJECT') {
    return 'ha rifiutato';
  }
  return 'in attesa';
}

/**
 * Le viste della schermata, per **area**: oggi solo le catene (il vecchio
 * `VISTE` di `servizi/coda.js` è stato rimosso con la coda).
 */
export const VISTE = {
  CATENA: {
    IN_RICERCA: 'IN_RICERCA',
    IN_CONFERME: 'IN_CONFERME',
    CONFERMATA: 'CONFERMATA',
    ANNULLATA: 'ANNULLATA',
    COMPLETATA: 'COMPLETATA',
    NEUTRA: 'NEUTRA',
  },
};

/**
 * Da `catena` (già normalizzata) alla vista da disegnare. Nessuna deduzione:
 * lo stato **grezzo** decide; uno stato sconosciuto → `NEUTRA` (chip col valore
 * del backend e nessun pulsante inventato).
 */
export function vistaCatena(catena) {
  const stato = typeof catena?.stato === 'string' ? catena.stato.trim().toUpperCase() : '';
  if (stato === STATI_CATENA.IN_RICERCA) {
    return VISTE.CATENA.IN_RICERCA;
  }
  if (stato === STATI_CATENA.IN_CONFERME) {
    return VISTE.CATENA.IN_CONFERME;
  }
  if (stato === STATI_CATENA.CONFERMATA) {
    return VISTE.CATENA.CONFERMATA;
  }
  if (stato === STATI_CATENA.ANNULLATA) {
    return VISTE.CATENA.ANNULLATA;
  }
  if (stato === STATI_CATENA.COMPLETATA) {
    return VISTE.CATENA.COMPLETATA;
  }
  return stato !== '' ? VISTE.CATENA.NEUTRA : VISTE.CATENA.NEUTRA;
}

/**
 * Le catene in due liste: attive (ricerca, conferme, confermate **e** stati
 * ignoti, che si mostrano in vista neutra fra le attive) e storico (concluse e
 * saltate). Non muta l'elenco ricevuto.
 */
export function separaPerStato(catene) {
  const elenco = Array.isArray(catene) ? catene : [];
  const attive = [];
  const storico = [];
  for (const catena of elenco) {
    const stato = typeof catena?.stato === 'string' ? catena.stato.trim().toUpperCase() : '';
    if (stato === STATI_CATENA.COMPLETATA || stato === STATI_CATENA.ANNULLATA) {
      storico.push(catena);
    } else {
      attive.push(catena);
    }
  }
  return { attive, storico };
}

/** I partecipanti in ordine di catena: copia ordinata per `posizione`. */
export function partecipantiInOrdine(partecipanti) {
  if (!Array.isArray(partecipanti)) {
    return [];
  }
  return [...partecipanti].sort(
    (primo, secondo) => (primo.posizione ?? 0) - (secondo.posizione ?? 0),
  );
}

/**
 * Il partecipante a cui punta la freccia di `partecipante`, o `null` se il
 * verso non c'è: legge **solo** `offreAChiave`, dichiarato dai `links` del
 * backend — non ricostruisce il cerchio.
 */
export function versoCatena(partecipante, partecipanti) {
  const elenco = partecipantiInOrdine(partecipanti);
  if (!partecipante?.offreAChiave) {
    return null;
  }
  return elenco.find((altro) => altro.chiave === partecipante.offreAChiave) ?? null;
}

/** La riga fissa sulle riserve (vincolo 6 del piano): un testo, in un punto solo. */
export const NOTA_SERVIZI_IMPEGNATI =
  'I servizi di tutti i partecipanti sono impegnati in questa catena: finché non conclude o salta non si usano in altri match o proposte dirette.';

// ---------------------------------------------------------------------------
// Le condizioni di inizio (`startAt`): composizione e validazione lato client
// ---------------------------------------------------------------------------

/** Formato atteso del campo data: `AAAA-MM-GG`. */
const SCHEMA_DATA = /^\d{4}-\d{2}-\d{2}$/;
/** Formato atteso del campo ora: `HH:MM`. */
const SCHEMA_ORA = /^\d{2}:\d{2}$/;

/**
 * La data è una data reale del calendario (`2026-02-30` non lo è): si ricompone
 * e si confronta con quella scritta. Serve anche il formato giusto, prima.
 */
export function validaData(data) {
  if (typeof data !== 'string' || !SCHEMA_DATA.test(data.trim())) {
    return false;
  }
  const [anno, mese, giorno] = data.trim().split('-').map(Number);
  const composta = new Date(anno, mese - 1, giorno);
  return (
    composta.getFullYear() === anno &&
    composta.getMonth() === mese - 1 &&
    composta.getDate() === giorno
  );
}

/** L'ora in formato `HH:MM` con valori plausibili. */
export function validaOra(ora) {
  if (typeof ora !== 'string' || !SCHEMA_ORA.test(ora.trim())) {
    return false;
  }
  const [ore, minuti] = ora.trim().split(':').map(Number);
  return ore >= 0 && ore <= 23 && minuti >= 0 && minuti <= 59;
}

/**
 * Compone l'istante di inizio in ISO 8601 **con secondi e fuso**, come vuole il
 * contratto: `2026-10-04T14:00:00+02:00`. L'offset è quello del dispositivo al
 * momento della composizione (il fuso in cui l'utente vive l'inizio).
 * Restituisce `null` per una data o un'ora non valide: il chiamante valida
 * prima con `validaData`/`validaOra`, e la guardia qui è difensiva.
 */
export function aOraLocaleIso(data, ora) {
  const parteData = typeof data === 'string' ? data.trim() : '';
  const parteOra = typeof ora === 'string' ? ora.trim() : '';
  if (!validaData(parteData) || !validaOra(parteOra)) {
    return null;
  }
  const [anno, mese, giorno] = parteData.split('-').map(Number);
  const [ore, minuti] = parteOra.split(':').map(Number);
  const istante = new Date(anno, mese - 1, giorno, ore, minuti, 0);
  const offsetMinuti = -istante.getTimezoneOffset();
  const segno = offsetMinuti >= 0 ? '+' : '-';
  const assoluto = Math.abs(offsetMinuti);
  const fuso = `${segno}${String(Math.floor(assoluto / 60)).padStart(2, '0')}:${String(
    assoluto % 60,
  ).padStart(2, '0')}`;
  return `${parteData}T${parteOra}:00${fuso}`;
}

// ---------------------------------------------------------------------------
// Formattazioni: date ISO del backend e residuo del conto alla rovescia
// ---------------------------------------------------------------------------

/**
 * Data e ora leggibili da una stringa ISO del backend: «4 ott 2026, 14:00».
 * Il locale è esplicito (`it-IT`) così la stringa è la stessa su web, Android
 * e iOS; una data illeggibile restituisce `null` e la riga non la mostra.
 */
export function formattaDataOra(valore) {
  if (typeof valore !== 'string' || valore.trim() === '') {
    return null;
  }
  const data = new Date(valore);
  if (Number.isNaN(data.getTime())) {
    return null;
  }
  const giorno = data.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const ora = data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return `${giorno}, ${ora}`;
}

/**
 * Il residuo in minuti come testo: «2 h 41 min», «41 min», «meno di un minuto»,
 * «tempo scaduto». `null` quando il residuo non c'è. **Spostata** da
 * `servizi/coda.js` senza cambiamenti.
 */
export function testoTempoResiduo(minutiResidui) {
  if (minutiResidui === null || minutiResidui === undefined) {
    return null;
  }
  if (minutiResidui <= 0) {
    return 'tempo scaduto';
  }
  if (minutiResidui < 1) {
    return 'meno di un minuto';
  }
  return formattaDurata(minutiResidui);
}

/**
 * L'ora di scadenza (`18:32`) da un istante in epoch, oppure `null`.
 * **Spostata** da `servizi/coda.js` senza cambiamenti.
 */
export function formattaOra(epochMs) {
  if (!Number.isFinite(epochMs)) {
    return null;
  }
  const data = new Date(epochMs);
  const ore = String(data.getHours()).padStart(2, '0');
  const minuti = String(data.getMinutes()).padStart(2, '0');
  return `${ore}:${minuti}`;
}

/**
 * La riga del tempo per una scadenza: residuo **più** il dato assoluto del
 * backend («scade il 4 ott 2026 alle 15:00»). La stringa ISO è il dato, il
 * residuo il conto: quando `tempo.scaduto` la riga dice che si sta aggiornando
 * lo stato — mai un esito. Firma nuova rispetto alla coda: qui la scadenza ha
 * anche la sua stringa ISO, che è quella che dice il **giorno**, non solo l'ora.
 */
export function testoScadenza(tempo, scadenzaMs, scadenzaIso) {
  if (tempo.illeggibile) {
    return 'La scadenza non è ancora disponibile';
  }
  if (tempo.scaduto) {
    return 'Tempo scaduto: aggiorno lo stato…';
  }
  const residuo = testoTempoResiduo(tempo.minutiResidui);
  const assoluta = formattaDataOra(scadenzaIso);
  const parti = [`mancano ${residuo}`];
  if (assoluta) {
    parti.push(`scade il ${assoluta}`);
  } else {
    const ora = formattaOra(scadenzaMs);
    if (ora) {
      parti.push(`scade alle ${ora}`);
    }
  }
  return parti.join(' · ');
}

// ---------------------------------------------------------------------------
// Frasi accessibili
// ---------------------------------------------------------------------------

/**
 * Una frase sola che riassume la catena: è l'etichetta della **regione viva**
 * della card, così il passaggio di stato viene annunciato quando accade.
 * L'utente autenticato diventa «tu».
 */
export function descriviCatena(catena) {
  if (!catena) {
    return '';
  }
  const stato = etichettaStatoCatena(catena.stato);
  const elenco = partecipantiInOrdine(catena.partecipanti);
  const nomi = elenco
    .map((partecipante) => (partecipante.sonoIo ? 'tu' : nomePersona(partecipante.persona)))
    .join(', ');
  const parti = [stato ? `Catena: ${stato}` : 'Catena'];
  if (catena.sonoInitiator) {
    parti.push('aperta da te');
  } else if (catena.apertaDa) {
    parti.push(`aperta da ${nomePersona(catena.apertaDa)}`);
  }
  if (nomi) {
    parti.push(`partecipanti: ${nomi}`);
  }
  return parti.join('. ');
}

/**
 * Una frase sola per un partecipante: chi è, la sua posizione nella catena e
 * il verso dichiarato (se c'è). Invece di frammenti da comporre col lettore
 * di schermo.
 */
export function descriviPartecipante(partecipante, partecipanti) {
  if (!partecipante) {
    return '';
  }
  const nome = partecipante.sonoIo ? 'Tu' : nomePersona(partecipante.persona);
  const destinatario = versoCatena(partecipante, partecipanti);
  const nomeDestinatario = destinatario
    ? destinatario.sonoIo
      ? 'te'
      : nomePersona(destinatario.persona)
    : null;
  const frasi = [
    partecipante.posizione !== null && partecipante.posizione !== undefined
      ? `${nome}, posizione ${partecipante.posizione + 1}`
      : nome,
  ];
  if (nomeDestinatario) {
    frasi.push(`offre il proprio servizio a ${nomeDestinatario}`);
  }
  frasi.push(etichettaDecisione(partecipante.decisione));
  return `${frasi.join(', ')}.`;
}

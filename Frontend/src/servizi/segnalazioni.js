/**
 * La segnalazione alla staff: la logica pura.
 *
 * È il quarto modulo di dominio, accanto a `offerta-ricerca.js` (la forma della
 * voce), `candidati.js` (la compatibilità fra due persone) e `coda.js` (la
 * catena). Qui c'è **il fatto segnalato**: i motivi, gli stati, la validazione e
 * il corpo di rete.
 *
 * Tre cose che questo modulo **non** fa, di proposito:
 * - **non decide l'esito**: se la staff sospende l'utente o assegna un token lo
 *   decide lei, chiudendo la segnalazione (piano 11). L'utente non vede lo stato
 *   della propria segnalazione: riceve una **notifica in-app** quando arriva
 *   l'esito (`servizi/notifiche.js`);
 * - **non inventa un motivo**: i motivi sono quelli decisi il 18 settembre 2026
 *   e restano una **proposta** del frontend; uno ignoto si mostra **grezzo**,
 *   come la coda fa con lo stato del gruppo;
 * - **non mette l'autore nel corpo**: chi segnala viene dal token di accesso,
 *   mai dal payload (lezione di P03/P05, IDOR).
 *
 * La segnalazione nasce **da un fatto concreto**: una catena saltata o un
 * accordo non rispettato. Per questo un `riferimento` è obbligatorio e la
 * schermata lo mostra in sola lettura — non si segnala «una persona qualsiasi».
 *
 * Nessuna funzione muta i dati ricevuti: copia, trasforma, restituisce.
 */

/**
 * Gli stati di una segnalazione, quelli del **modello obiettivo**
 * (`docs/00-progetto/obiettivo-e-dominio.md`, «Il ciclo di una segnalazione»).
 * La proposta della Parte 21 delle segnalazioni usava `APERTO`, `IN_ESAME`,
 * `CHIUSO`: i due insiemi **non coincidono** e la divergenza è segnalata ai
 * colleghi. Finché non decidono, valgono questi.
 */
export const STATI_SEGNALAZIONE = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN_REVIEW',
  CLOSED: 'CLOSED',
};

/**
 * Etichette italiane degli stati. «Aperta» dice cosa sta succedendo senza
 * tradurre lo stato in un esito: l'esito lo scrive la staff.
 */
export const ETICHETTE_STATO_SEGNALAZIONE = {
  [STATI_SEGNALAZIONE.OPEN]: 'Aperta',
  [STATI_SEGNALAZIONE.IN_REVIEW]: 'In esame',
  [STATI_SEGNALAZIONE.CLOSED]: 'Chiusa',
};

/**
 * I motivi, decisi dal titolare il 18 settembre 2026. Sono i quattro casi che il
 * frontend sa raccontare; i nomi definitivi li decidono i colleghi e il backend
 * rifiuta un motivo non ammesso (`400`).
 */
export const MOTIVI_SEGNALAZIONE = {
  NON_HA_SVOLTO: 'NON_HA_SVOLTO',
  ABBANDONO_GRUPPO: 'ABBANDONO_GRUPPO',
  LINGUAGGIO_OFFENSIVO: 'LINGUAGGIO_OFFENSIVO',
  ALTRO: 'ALTRO',
};

/** Le etichette dei motivi, nella stessa forma dell'elenco a scelta della schermata. */
export const ETICHETTE_MOTIVO = {
  [MOTIVI_SEGNALAZIONE.NON_HA_SVOLTO]: 'Non ha svolto il servizio promesso',
  [MOTIVI_SEGNALAZIONE.ABBANDONO_GRUPPO]: 'Ha abbandonato il gruppo di scambio',
  [MOTIVI_SEGNALAZIONE.LINGUAGGIO_OFFENSIVO]: 'Linguaggio offensivo',
  [MOTIVI_SEGNALAZIONE.ALTRO]: 'Altro',
};

/** L'elenco dei motivi nell'ordine in cui si mostrano, per non dettarlo nella schermata. */
export const ELENCO_MOTIVI = Object.values(MOTIVI_SEGNALAZIONE);

/**
 * Il limite della descrizione, dichiarato **qui** e non nel componente: è una
 * regola del form, come `LIMITE_MANSIONE` per le voci. Il `maxLength` del campo
 * e il controllo di `validaSegnalazione` leggono lo stesso numero.
 */
export const LIMITE_DESCRIZIONE = 500;

/** Il tipo di fatto a cui la segnalazione si aggancia: almeno uno è obbligatorio. */
export const RIFERIMENTI = {
  GRUPPO: 'GRUPPO',
  ACCORDO: 'ACCORDO',
};

/**
 * L'etichetta di un motivo, oppure il **valore grezzo** se non lo conosciamo: un
 * motivo ignoto si mostra così com'è, invece di un «Altro» che sarebbe una
 * traduzione inventata. `null` solo quando il motivo manca.
 */
export function etichettaMotivo(motivo) {
  if (typeof motivo !== 'string' || motivo.trim() === '') {
    return null;
  }
  const chiave = motivo.trim().toUpperCase();
  return ETICHETTE_MOTIVO[chiave] ?? chiave;
}

/**
 * L'etichetta di uno stato, oppure il **valore grezzo** se non lo conosciamo
 * (stessa regola della coda e dei buoni). `null` solo quando lo stato manca.
 */
export function etichettaStatoSegnalazione(stato) {
  if (typeof stato !== 'string' || stato.trim() === '') {
    return null;
  }
  const chiave = stato.trim().toUpperCase();
  return ETICHETTE_STATO_SEGNALAZIONE[chiave] ?? chiave;
}

/**
 * Il tono del chip, da tradurre nei colori del tema, con lo stesso vocabolario
 * degli altri moduli:
 * - `info` (neutro): aperta, nessuno se ne sta occupando;
 * - `accent` (ambra): in esame, la staff la sta lavorando — lo stesso tono di
 *   «In esecuzione» e del buono impegnato;
 * - `service` (verde): chiusa, la pratica è conclusa;
 * - `info` anche per uno stato ignoto: il colore non è mai l'unico segnale.
 */
export function tonoStatoSegnalazione(stato) {
  const chiave = typeof stato === 'string' ? stato.trim().toUpperCase() : '';
  if (chiave === STATI_SEGNALAZIONE.IN_REVIEW) {
    return 'accent';
  }
  if (chiave === STATI_SEGNALAZIONE.CLOSED) {
    return 'service';
  }
  return 'info';
}

/**
 * L'id di un riferimento, normalizzato senza inventare niente: un intero
 * positivo resta un numero, un id testuale non vuoto resta una stringa (i finti
 * delle catene usano id come `finto-1`: sono la stringa che il backend vero
 * sostituirà con un intero), tutto il resto vale come assente.
 * Esportata perché la stessa regola serve alla normalizzazione in
 * `api/normalizzazioni.js`: due copie divergerebbero.
 */
export function idRiferimento(valore) {
  if (typeof valore === 'number') {
    return Number.isInteger(valore) && valore > 0 ? valore : null;
  }
  if (typeof valore !== 'string' || valore.trim() === '') {
    return null;
  }
  const testo = valore.trim();
  const numero = Number(testo);
  return Number.isInteger(numero) && numero > 0 ? numero : testo;
}

/** Un riferimento è utilizzabile quando porta un id: è il fatto da cui si segnala. */
export function riferimentoValido(riferimento) {
  return Boolean(riferimento && riferimento.id !== null && riferimento.id !== undefined);
}

/**
 * Il riferimento nella forma della UI: `{tipo, id}`, oppure `null` quando non
 * c'è né un gruppo né un accordo. Un id vuoto vale come assente: una segnalazione
 * senza il fatto è una segnalazione che non si può mandare.
 */
export function riferimentoDaParametri(parametri) {
  const idGruppo = idRiferimento(parametri?.id_gruppo);
  if (idGruppo !== null) {
    return { tipo: RIFERIMENTI.GRUPPO, id: idGruppo };
  }
  const idAccordo = idRiferimento(parametri?.id_accordo);
  if (idAccordo !== null) {
    return { tipo: RIFERIMENTI.ACCORDO, id: idAccordo };
  }
  return null;
}

/**
 * Il riferimento in una frase, per la riga in sola lettura: «la catena #12».
 * Un id non numerico (i finti) non si mostra: il numero interno al backend non
 * aggiunge niente a quello che l'utente sta leggendo.
 */
export function testoRiferimento(riferimento) {
  if (!riferimentoValido(riferimento)) {
    return null;
  }
  const cosa = riferimento.tipo === RIFERIMENTI.ACCORDO ? "l'accordo" : 'la catena';
  return typeof riferimento.id === 'number' ? `${cosa} #${riferimento.id}` : cosa;
}

/**
 * I parametri della rotta `/segnala` a partire da una catena saltata: la persona
 * da segnalare è **chi è uscito**, e il fatto è il gruppo. `null` quando la
 * segnalazione non si può aprire — nessuno è uscito, l'uscita non ha una persona
 * identificabile, il gruppo non ha un id, oppure sono uscito io (in quel caso non
 * c'è nessuno da segnalare: la riga del token è già falsa).
 *
 * Sta qui e non in due componenti perché `scambi.jsx` e `CardCatenaConclusa.jsx`
 * devono decidere la stessa cosa, e due copie della stessa guardia divergono.
 */
export function parametriSegnalazioneDaUscita(gruppo, utenteId) {
  const persona = gruppo?.uscita?.persona;
  const idSegnalato = idRiferimento(persona?.id ?? gruppo?.uscita?.utenteId);
  if (idSegnalato === null) {
    return null;
  }
  if (utenteId !== null && utenteId !== undefined && Number(idSegnalato) === Number(utenteId)) {
    return null;
  }
  const idGruppo = idRiferimento(gruppo?.chiave ?? gruppo?.id);
  if (idGruppo === null) {
    return null;
  }
  return {
    id_gruppo: String(idGruppo),
    utente_id: String(idSegnalato),
    nome: persona?.nome ?? '',
    cognome: persona?.cognome ?? '',
    username: persona?.username ?? '',
  };
}

/**
 * Il riferimento nella forma di rete: il campo che il payload deve portare. Il
 * gruppo e l'accordo sono **lo stesso riferimento** in due campi diversi.
 */
function campiRiferimento(riferimento) {
  if (!riferimentoValido(riferimento)) {
    return {};
  }
  return riferimento.tipo === RIFERIMENTI.ACCORDO
    ? { id_accordo: riferimento.id }
    : { id_gruppo: riferimento.id };
}

/**
 * La validazione del form, campo per campo: restituisce un oggetto con un
 * messaggio per ogni campo non valido, e **nessuna chiave** quando va bene.
 * Vuoto significa valido, così la schermata decide il pulsante con
 * `Object.keys(errori).length === 0` e non con una seconda regola.
 *
 * Regole: motivo obbligatorio e ammesso, riferimento obbligatorio (il fatto),
 * utente segnalato obbligatorio, descrizione facoltativa ma entro il limite.
 * Il resto lo decide il backend (`400`, `403`, `404`, `409`).
 */
export function validaSegnalazione({ motivo, descrizione, riferimento, segnalatoId } = {}) {
  const errori = {};

  const motivoValido =
    typeof motivo === 'string' && Object.values(MOTIVI_SEGNALAZIONE).includes(motivo);
  if (!motivoValido) {
    errori.motivo = 'Scegli il motivo della segnalazione.';
  }

  const descrizioneTesto = typeof descrizione === 'string' ? descrizione.trim() : '';
  if (descrizioneTesto.length > LIMITE_DESCRIZIONE) {
    errori.descrizione = `La descrizione può avere al massimo ${LIMITE_DESCRIZIONE} caratteri.`;
  }

  if (!riferimentoValido(riferimento)) {
    errori.riferimento = 'Manca il fatto da segnalare: riapri la segnalazione dalla catena.';
  }

  if (!Number.isInteger(segnalatoId) || segnalatoId <= 0) {
    errori.segnalato = 'Manca la persona da segnalare: riapri la segnalazione dalla catena.';
  }

  return errori;
}

/**
 * Il corpo della richiesta di segnalazione, nella forma di rete. Le chiavi sono
 * quelle proposte per `segnalazioni.php` e il `// TODO(backend)` sta nel bivio di
 * `api/barattolo.js`: qui si costruisce una volta sola, come fa
 * `aPayloadPubblicazione` per le voci.
 *
 * L'autore **non c'è**: viene dal token di accesso. Una descrizione vuota si
 * omette invece di spedire `""` (il backend la salva come `NULL`).
 */
export function aPayloadSegnalazione({ segnalatoId, motivo, descrizione, riferimento } = {}) {
  const payload = {
    utente_segnalato_id: segnalatoId,
    motivo,
    ...campiRiferimento(riferimento),
  };
  const testo = typeof descrizione === 'string' ? descrizione.trim() : '';
  if (testo !== '') {
    payload.descrizione = testo;
  }
  return payload;
}

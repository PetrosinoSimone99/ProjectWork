import { STATI_PUBBLICAZIONE, TIPI_VOCE } from '@/servizi/offerta-ricerca';
import { RIFERIMENTI, idRiferimento } from '@/servizi/segnalazioni';
import { SCELTE_CANDIDATO, chiaveCandidato, motivoCompatibilita } from '@/servizi/candidati';

/**
 * Le normalizzazioni condivise: dalla forma di rete del backend alla forma che
 * la UI può mostrare.
 *
 * Vivono qui e non in `api/barattolo.js` per una ragione misurata: il file degli
 * endpoint ha superato le 800 righe del progetto, e queste sono le funzioni pure
 * che si possono spostare **senza cambiare una riga di comportamento** (il
 * piano della coda prevedeva esattamente questo taglio). `barattolo.js` le
 * importa e continua a esporre quelle che erano pubbliche.
 *
 * La regola vale per tutte: **copia, trasforma, restituisci**. Niente chiamate
 * di rete, niente import da `barattolo.js` (niente cicli), e ogni funzione
 * scarta le righe che la UI non può mostrare invece di disegnare dati inventati.
 */

/** Numero intero, oppure `null` per un valore assente o non numerico. */
export function numeroInteroONull(valore) {
  if (valore === null || valore === undefined || valore === '') {
    return null;
  }
  const numero = Number(valore);
  return Number.isInteger(numero) ? numero : null;
}

/** Nome addomesticato: stringa non vuota dopo `trim`, altrimenti `null`. */
export function testoONull(valore) {
  return typeof valore === 'string' && valore.trim() !== '' ? valore.trim() : null;
}

/**
 * Lo stato di pubblicazione nella forma che mostra la UI.
 * TODO(backend): i valori veri non sono decisi — se i colleghi scelgono
 * `ACTIVE`/`INACTIVE` o altri nomi, si cambia qui e nessun componente si tocca.
 * Una riga **senza** stato è «Pubblicata» (è così che la demo legge le voci
 * salvate prima che il campo esistesse); uno stato **sconosciuto** si
 * restituisce così com'è invece di nasconderlo.
 */
export function normalizzaStatoPubblicazione(stato) {
  if (typeof stato !== 'string' || !stato.trim()) {
    return STATI_PUBBLICAZIONE.PUBBLICATA;
  }
  return stato.trim().toUpperCase();
}

/** Lo stato con cui il backend può dire che la voce non c'è più. */
const STATO_ELIMINATA = 'ELIMINATA';

/**
 * Una riga di `servizi.php` nella forma della voce
 * (vedi `servizi/offerta-ricerca.js`). Restituisce `null` per le righe che la UI
 * non può mostrare: un tipo sconosciuto non ha una sezione in cui finire e una
 * voce eliminata non deve comparire. `indice` serve solo a dare una chiave
 * stabile a una riga senza id (che resta senza azioni: lezione di P37).
 */
export function normalizzaPubblicazione(riga, indice = 0) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }

  const tipo = typeof riga.tipo === 'string' ? riga.tipo.trim().toUpperCase() : '';
  if (tipo !== TIPI_VOCE.OFFERTA && tipo !== TIPI_VOCE.RICERCA) {
    return null;
  }

  const stato = normalizzaStatoPubblicazione(riga.stato);
  if (stato === STATO_ELIMINATA) {
    return null;
  }

  const id = numeroInteroONull(riga.id);
  return {
    chiave: id === null ? `${tipo}-riga-${indice}` : `${tipo}-${id}`,
    tipo,
    id,
    idCategoria: numeroInteroONull(riga.id_categoria),
    mansione: typeof riga.mansione === 'string' ? riga.mansione : '',
    daRemoto: riga.da_remoto === true,
    localita: typeof riga.localita === 'string' ? riga.localita : '',
    stato,
  };
}

/** La riga salvata: tollera la busta `{data:{servizio}}` e la riga nuda. */
export function normalizzaServizio(risposta) {
  return normalizzaPubblicazione(risposta?.data?.servizio ?? risposta?.servizio ?? risposta);
}

/** L'elenco: `{data:{servizi:[…]}}`, `{servizi:[…]}` oppure l'array nudo. */
export function normalizzaPubblicazioni(risposta) {
  const elenco = risposta?.data?.servizi ?? risposta?.servizi ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map((riga, indice) => normalizzaPubblicazione(riga, indice)).filter(Boolean);
}

/**
 * L'autore di una riga di catalogo, tollerando la forma annidata (`offerente`)
 * e quella piatta (`utente_id`, `nome`, …): quale delle due sceglieranno i
 * colleghi è indifferente, le legge questa normalizzazione.
 *
 * La località della **persona** (dal profilo) è cosa diversa dalla località
 * dell'annuncio: si legge solo dentro `offerente`, e se manca non si mostra.
 */
export function normalizzaOfferente(riga) {
  const dentro = riga?.offerente && typeof riga.offerente === 'object' ? riga.offerente : {};
  return {
    id: numeroInteroONull(dentro.id ?? dentro.utente_id ?? riga?.utente_id),
    username: testoONull(dentro.username ?? riga?.username),
    nome: testoONull(dentro.nome ?? riga?.nome),
    cognome: testoONull(dentro.cognome ?? riga?.cognome),
    localita: testoONull(dentro.localita),
  };
}

// ---------------------------------------------------------------------------
// Segnalazioni e notifiche in-app
//
// Stanno qui per la stessa ragione delle altre: sono funzioni pure che
// `barattolo.js` usa nel bivio dei finti e nel ramo vero, così la forma della
// segnalazione e della notifica è decisa **una volta sola**. Il riferimento al
// fatto (`id_gruppo` o `id_accordo`) usa `idRiferimento` di
// `servizi/segnalazioni.js`: la stessa regola serve alla rotta e alla
// validazione, e due copie divergerebbero.
// ---------------------------------------------------------------------------

/**
 * Il riferimento al fatto: `{tipo, id}`, da `id_gruppo` o `id_accordo`. `null`
 * quando il backend non ne manda nessuno — e in quel caso la riga non si inventa
 * un contesto.
 */
function normalizzaRiferimentoSegnalazione(riga) {
  const idGruppo = idRiferimento(riga?.id_gruppo ?? riga?.idGruppo);
  if (idGruppo !== null) {
    return { tipo: RIFERIMENTI.GRUPPO, id: idGruppo };
  }
  const idAccordo = idRiferimento(riga?.id_accordo ?? riga?.idAccordo);
  if (idAccordo !== null) {
    return { tipo: RIFERIMENTI.ACCORDO, id: idAccordo };
  }
  return null;
}

/**
 * Una segnalazione nella forma della UI. `stato` è in maiuscolo e uno stato
 * **ignoto passa così com'è**: la schermata lo mostra grezzo, non lo traduce a
 * caso (stessa vista neutra della coda e dei buoni). L'autore non c'è: è chi
 * chiede, e la UI non lo disegna.
 */
export function normalizzaSegnalazione(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const stato = typeof riga.stato === 'string' ? riga.stato.trim().toUpperCase() : '';
  const motivo = typeof riga.motivo === 'string' ? riga.motivo.trim() : '';
  return {
    id,
    stato: stato || null,
    motivo: motivo || null,
    descrizione: testoONull(riga.descrizione),
    segnalato: numeroInteroONull(riga.segnalato_id ?? riga.segnalatoId ?? riga.utente_segnalato_id),
    riferimento: normalizzaRiferimentoSegnalazione(riga),
    // `creato_il` è la convenzione del progetto; `creata_il` è la forma usata nella
    // proposta di `segnalazioni.php` (Parte 21): si accettano entrambe, così un
    // nome diverso non fa sparire la data.
    creataIl: testoONull(riga.creato_il ?? riga.creata_il ?? riga.creataIl),
  };
}

/** L'elenco delle segnalazioni: `{data:{segnalazioni:[…]}}` oppure l'array nudo. */
export function normalizzaSegnalazioni(risposta) {
  const elenco = risposta?.data?.segnalazioni ?? risposta?.segnalazioni ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaSegnalazione).filter(Boolean);
}

/**
 * Una persona **annidata** in una riga (`autore`, `segnalato`, `partecipanti`):
 * `{id, username, nome, cognome}`. `normalizzaOfferente` non serve qui perché
 * legge l'autore di un annuncio (annidato in `offerente` o piatto nella riga):
 * questa legge l'oggetto che *è* la persona. Tutto ciò che manca resta `null`,
 * senza inventare un nome.
 */
export function normalizzaPersona(valore) {
  if (!valore || typeof valore !== 'object') {
    return { id: null, username: null, nome: null, cognome: null };
  }
  return {
    id: numeroInteroONull(valore.id ?? valore.utente_id),
    username: testoONull(valore.username),
    nome: testoONull(valore.nome),
    cognome: testoONull(valore.cognome),
  };
}

/**
 * Gli esiti di una chiusura nella forma della UI: una lista di stringhe in
 * maiuscolo. Il backend puo mandarne una sola (`esito`) o piu di una (`esiti`),
 * e un valore ignoto **passa cosi com'è**: la schermata lo mostra grezzo invece
 * di tradurlo a caso (stessa vista neutra di stati e buoni).
 */
export function normalizzaEsiti(valore) {
  const elenco = Array.isArray(valore) ? valore : valore === null || valore === undefined ? [] : [valore];
  return elenco
    .map((esito) => (typeof esito === 'string' ? esito.trim().toUpperCase() : ''))
    .filter((esito) => esito !== '');
}

/**
 * Una segnalazione **vista dalla staff**: la forma della segnalazione piu chi l'ha
 * scritta, chi e stato segnalato, i partecipanti al fatto (per la scelta del
 * beneficiario del token) e l'esito della chiusura. L'autore qui c'e perche la
 * staff deve sapere chi ha segnalato; nella riga dell'utente non c'era — era chi
 * chiedeva, e la UI non lo disegnava.
 */
export function normalizzaSegnalazioneStaff(riga) {
  const base = normalizzaSegnalazione(riga);
  if (!base) {
    return null;
  }
  const autore = normalizzaPersona(riga?.autore ?? riga?.segnalante);
  const segnalato =
    riga?.segnalato && typeof riga.segnalato === 'object'
      ? normalizzaPersona(riga.segnalato)
      : { id: base.segnalato, username: null, nome: null, cognome: null };
  const dichiarati = Array.isArray(riga?.partecipanti)
    ? riga.partecipanti.map(normalizzaPersona).filter((persona) => persona.id !== null)
    : [];
  return {
    ...base,
    autore,
    segnalato,
    // Senza l'elenco dei partecipanti si ripiega sui due che la riga conosce:
    // la scelta del beneficiario resta possibile.
    partecipanti:
      dichiarati.length > 0
        ? dichiarati
        : [autore, segnalato].filter((persona) => persona.id !== null),
    gestitaDa: numeroInteroONull(riga?.gestito_da ?? riga?.gestitaDa),
    esiti: normalizzaEsiti(riga?.esiti ?? riga?.esito),
    nota: testoONull(riga?.nota ?? riga?.nota_staff),
    chiusaIl: testoONull(riga?.chiusa_il ?? riga?.chiuso_il ?? riga?.chiusaIl),
  };
}

/** L'elenco per la staff: `{data:{segnalazioni:[…]}}` oppure l'array nudo. */
export function normalizzaSegnalazioniStaff(risposta) {
  const elenco = risposta?.data?.segnalazioni ?? risposta?.segnalazioni ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaSegnalazioneStaff).filter(Boolean);
}

/**
 * Una notifica nella forma della UI. `letta` è `true` **solo** quando il backend
 * lo dice: una notifica senza il campo è da leggere. Il tipo ignoto resta com'è e
 * il testo lo decide `servizi/notifiche.js`.
 */
export function normalizzaNotifica(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const tipo = typeof riga.tipo === 'string' ? riga.tipo.trim() : '';
  return {
    id,
    tipo: tipo || null,
    messaggio: testoONull(riga.messaggio),
    idToken: numeroInteroONull(riga.id_token ?? riga.idToken),
    letta: riga.letta === true,
    creataIl: testoONull(riga.creata_il ?? riga.creataIl),
  };
}

/** L'elenco delle notifiche: `{data:{notifiche:[…]}}` oppure l'array nudo. */
export function normalizzaNotifiche(risposta) {
  const elenco = risposta?.data?.notifiche ?? risposta?.notifiche ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaNotifica).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Utenti dell'area staff
//
// Stanno qui per la stessa ragione delle altre: sono funzioni pure che
// `barattolo.js` usa nel bivio dei finti e nel ramo vero, così la forma della
// riga utente è decisa **una volta sola** e i due manager (che rispondono con la
// busta piatta `{messaggio, utente}`) non dettano la forma alla schermata.
// ---------------------------------------------------------------------------

/**
 * Un utente nella forma della UI: `{id, username, nome, cognome, ruolo, stato,
 * creatoIl}`. Ruolo e stato sono in maiuscolo e un valore **ignoto passa così
 * com'è**: la schermata lo mostra grezzo, non lo traduce a caso (stessa vista
 * neutra di stati e buoni). Una riga senza id non si può mostrare né gestire,
 * quindi si scarta.
 */
export function normalizzaUtenteStaff(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id ?? riga.utente_id);
  if (id === null) {
    return null;
  }
  const ruolo = typeof riga.ruolo === 'string' ? riga.ruolo.trim().toUpperCase() : '';
  const stato = typeof riga.stato === 'string' ? riga.stato.trim().toUpperCase() : '';
  return {
    id,
    username: testoONull(riga.username),
    nome: testoONull(riga.nome),
    cognome: testoONull(riga.cognome),
    ruolo: ruolo || null,
    stato: stato || null,
    creatoIl: testoONull(riga.creato_il ?? riga.creatoIl),
  };
}

/** L'elenco degli utenti: `{data:{utenti:[…]}}`, `{utenti:[…]}` oppure l'array nudo. */
export function normalizzaUtentiStaff(risposta) {
  const elenco = risposta?.data?.utenti ?? risposta?.utenti ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaUtenteStaff).filter(Boolean);
}

/**
 * L'esito dei due manager nella forma della schermata: l'utente aggiornato e il
 * `messaggio` del backend, gi\u00e0 pronto per il `Banner`. La busta \u00e8 **piatta**
 * (`{messaggio, utente}`, non `{success, message, data}`): \u00e8 la seconda busta del
 * progetto e la legge `client.js`.
 */
export function normalizzaEsitoUtenteStaff(risposta) {
  return {
    utente: normalizzaUtenteStaff(risposta?.utente ?? risposta),
    messaggio: typeof risposta?.messaggio === 'string' ? risposta.messaggio : '',
  };
}
// ---------------------------------------------------------------------------
// Coda e gruppi di match — la catena dello swipe
//
// Spostate qui dal file degli endpoint come le altre: sono pure, non chiamano la
// rete e non importano da `barattolo.js`. Il frontend non calcola la catena e non
// decide esiti: legge `in_coda`, lo stato del gruppo e i versi dichiarati
// (`offre_a`). È anche il motivo per cui `hooks/useCoda.js` e `servizi/coda.js`
// non fanno parsing di date né di stati.
// ---------------------------------------------------------------------------

/**
 * Lo stato del gruppo nella forma che la UI conosce: maiuscolo e senza spazi,
 * con un valore **ignoto lasciato passare** (la vista neutra della schermata).
 * `null` solo quando il backend non lo manda.
 * TODO(backend): i valori veri dell'enum di `gruppi_match` non sono decisi.
 */
export function normalizzaStatoGruppo(stato) {
  if (typeof stato !== 'string' || !stato.trim()) {
    return null;
  }
  return stato.trim().toUpperCase();
}

/**
 * La scadenza della ricerca in epoch (millisecondi), oppure `null` se assente o
 * illeggibile. Si chiede l'**istante assoluto**, non la durata, perché il residuo
 * deve sopravvivere alla chiusura dell'app: una durata ricevuta un'ora fa non
 * dice più niente senza sapere quanto tempo è passato.
 *
 * Fallback dichiarato: se i colleghi mandano `secondi_residui` (un numero), lo si
 * converte **una volta sola** in un istante assoluto al momento della ricezione.
 * Da qui in poi la UI non maneggia mai una stringa di data.
 */
export function normalizzaScadenza(valore) {
  if (typeof valore === 'string') {
    const millisecondi = Date.parse(valore);
    return Number.isFinite(millisecondi) ? millisecondi : null;
  }
  if (typeof valore === 'number' && Number.isFinite(valore)) {
    return Date.now() + valore * 1000;
  }
  return null;
}

/**
 * Il verso della catena: a chi offre un membro. `null` quando il backend non lo
 * dichiara, e in quel caso la UI **non disegna frecce** e non deduce le chat.
 */
function normalizzaArco(valore) {
  if (!valore || typeof valore !== 'object') {
    return null;
  }
  const posizione = numeroInteroONull(valore.posizione);
  const utenteId = numeroInteroONull(valore.utente_id ?? valore.id);
  if (posizione === null && utenteId === null) {
    return null;
  }
  return { posizione, utenteId };
}

/** Chi è uscito dal gruppo: la persona, quando e — se c'è — il motivo del backend. */
function normalizzaUscita(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const persona = normalizzaOfferente(riga);
  return {
    utenteId: persona.id,
    persona,
    quando: testoONull(riga.quando ?? riga.concluso_il),
    // Il motivo è una stringa del backend: si mostra **così com'è**, e se manca
    // non si scrive nessun motivo inventato.
    motivo: testoONull(riga.motivo),
  };
}

/**
 * Un membro della catena nella forma della UI. La voce usa
 * `normalizzaPubblicazione` (stessa forma delle schermate 1–2) e la persona usa
 * `normalizzaOfferente` (che legge già la forma annidata e quella piatta).
 * `sonoIo` si calcola **qui**, in un punto solo, come fa `normalizzaAccordo`.
 */
function normalizzaMembro(riga, utenteId) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const personaBase = normalizzaOfferente(riga);
  if (personaBase.id === null) {
    return null;
  }
  // La località della persona, nella riga del membro, è piatta (`localita`):
  // `normalizzaOfferente` legge solo quella annidata (per non confondere la
  // località dell'annuncio con quella della persona), quindi si completa qui.
  const persona = { ...personaBase, localita: personaBase.localita ?? testoONull(riga.localita) };
  const rigaOfferta = riga.offre ?? riga.offerta ?? null;
  if (!rigaOfferta || typeof rigaOfferta !== 'object') {
    return null;
  }
  const offerta = normalizzaPubblicazione({ ...rigaOfferta, tipo: TIPI_VOCE.OFFERTA });
  if (!offerta) {
    return null;
  }
  const rigaRicerca = riga.cerca ?? riga.ricerca ?? null;
  const ricerca =
    rigaRicerca && typeof rigaRicerca === 'object'
      ? normalizzaPubblicazione({ ...rigaRicerca, tipo: TIPI_VOCE.RICERCA })
      : null;

  return {
    chiave: String(persona.id),
    posizione: numeroInteroONull(riga.posizione),
    persona,
    offerta,
    ricerca,
    offreA: normalizzaArco(riga.offre_a),
    sonoIo:
      utenteId !== null && utenteId !== undefined && Number(persona.id) === Number(utenteId),
  };
}

/** Un gruppo nella forma della UI: membri, conteggio, uscita e diritto al token. */
export function normalizzaGruppo(riga, utenteId) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const membri = Array.isArray(riga.membri)
    ? riga.membri.map((membro) => normalizzaMembro(membro, utenteId)).filter(Boolean)
    : [];
  return {
    chiave: riga.id === undefined || riga.id === null ? null : String(riga.id),
    id: numeroInteroONull(riga.id),
    stato: normalizzaStatoGruppo(riga.stato),
    // Il totale previsto: la UI lo mostra come «2 di 4» **solo** se c'è, e non
    // scrive mai «quattro» (il numero lo decide il backend).
    numeroPartecipanti: numeroInteroONull(riga.numero_partecipanti),
    membri,
    uscita: normalizzaUscita(riga.uscita),
    // TODO(backend): chi ha offerto e non ha ricevuto lo dichiara il backend.
    // Il frontend non lo deduce e non lo chiede all'utente.
    puoiChiedereToken:
      riga.puoi_chiedere_token === true || riga.mia_parte_svolta === true,
  };
}

/** Lo storico: i gruppi conclusi e quelli saltati, con la data in cui sono finiti. */
export function normalizzaStoricoGruppi(elenco, utenteId) {
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco
    .map((riga) => {
      const gruppo = normalizzaGruppo(riga, utenteId);
      if (!gruppo) {
        return null;
      }
      return { ...gruppo, conclusoIl: testoONull(riga.concluso_il) };
    })
    .filter(Boolean);
}

/**
 * La lettura della coda nella forma della UI: `inCoda`, la scadenza già in epoch,
 * il gruppo e lo storico. La scadenza si cerca in testa alla risposta e dentro il
 * gruppo (entrambe le posizioni funzionano), più il fallback `secondi_residui`.
 */
export function normalizzaCoda(risposta, utenteId) {
  const dati = risposta?.data ?? risposta;
  if (!dati || typeof dati !== 'object') {
    return { inCoda: false, scadenzaMs: null, gruppo: null, gruppiConclusi: [] };
  }
  return {
    inCoda: dati.in_coda === true,
    scadenzaMs: normalizzaScadenza(
      dati.scadenza ?? dati.gruppo?.scadenza ?? dati.secondi_residui,
    ),
    gruppo: normalizzaGruppo(dati.gruppo, utenteId),
    gruppiConclusi: normalizzaStoricoGruppi(dati.gruppi_conclusi, utenteId),
  };
}
// ---------------------------------------------------------------------------
// Buoni («I miei token»)
//
// Spostate qui dal file degli endpoint come le altre: sono pure. `stato` resta
// in maiuscolo e uno stato **ignoto passa così com'è**, perché è la schermata a
// mostrarlo grezzo; le date restano le stringhe del backend e le formatta
// `servizi/token.js`.
// ---------------------------------------------------------------------------

/**
 * Un buono nella forma della UI. `stato` è in maiuscolo e uno stato **ignoto
 * passa così com'è**: la schermata lo mostra grezzo (stessa vista neutra della
 * coda), non lo traduce a caso. Le date restano le stringhe del backend:
 * formattarle è compito di `servizi/token.js`.
 */
export function normalizzaToken(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const stato = typeof riga.stato === 'string' ? riga.stato.trim().toUpperCase() : '';
  return {
    id,
    stato: stato || null,
    origine: testoONull(riga.origine),
    creatoIl: testoONull(riga.creato_il ?? riga.creatoIl),
    scadenza: testoONull(riga.scadenza),
    usatoIl: testoONull(riga.usato_il ?? riga.usatoIl),
    idServizioUsato: numeroInteroONull(riga.id_servizio_usato ?? riga.idServizioUsato),
    idAccordo: numeroInteroONull(riga.id_accordo ?? riga.idAccordo),
  };
}

/** L'elenco dei buoni: `{data:{token:[…]}}` oppure l'array nudo. */
export function normalizzaElencoToken(risposta) {
  const elenco = risposta?.data?.token ?? risposta?.token ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaToken).filter(Boolean);
}
// ---------------------------------------------------------------------------
// Candidati di «Loop» — le schede dello swipe
//
// Spostate qui dal file degli endpoint come le altre: sono pure e non importano
// da `barattolo.js`. La scheda si costruisce con **whitelist esplicita**, così
// un campo in più del backend non arriva a schermo nemmeno per sbaglio.
// ---------------------------------------------------------------------------

/**
 * Un candidato nella forma della scheda. Costruito con **whitelist** esplicita:
 * il backend manda la riga intera, e un campo in più (email, telefono, date, id
 * interni) non deve arrivare a schermo nemmeno per sbaglio.
 *
 * Restituisce `null` per le righe che non si possono mostrare (nessuna persona,
 * nessuna offerta), e per la propria persona: la pila è di altri.
 */
function normalizzaCandidato(riga, utenteId) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }

  // `normalizzaOfferente` legge già l'autore annidato (`offerente`) **e** quello
  // piatto (`utente_id`, `nome`, …): va chiamata sulla riga, non sull'oggetto
  // interno, altrimenti non trova né l'uno né l'altro.
  const persona = normalizzaOfferente(riga);
  if (persona.id === null) {
    return null;
  }
  if (utenteId !== null && utenteId !== undefined && Number(persona.id) === Number(utenteId)) {
    return null;
  }

  const rigaOfferta = riga.offre ?? riga.offerta ?? null;
  if (!rigaOfferta || typeof rigaOfferta !== 'object') {
    return null;
  }
  const offerta = normalizzaPubblicazione({ ...rigaOfferta, tipo: TIPI_VOCE.OFFERTA });
  if (!offerta) {
    return null;
  }

  const rigaRicerca = riga.cerca ?? riga.ricerca ?? null;
  const ricerca =
    rigaRicerca && typeof rigaRicerca === 'object'
      ? normalizzaPubblicazione({ ...rigaRicerca, tipo: TIPI_VOCE.RICERCA })
      : null;

  return {
    chiave: chiaveCandidato({ persona }),
    persona,
    offerta,
    ricerca,
    // Un motivo sconosciuto o assente diventa `null`: la riga sparisce.
    motivo: motivoCompatibilita(riga.motivo ?? riga.motivo_compatibilita),
    tiHaScelto:
      riga.ti_ha_scelto === true || riga.scelta_ricevuta === SCELTE_CANDIDATO.INTERESSE,
  };
}

/**
 * L'esito di una scelta nella forma della UI: `match` è **solo** quello che la
 * risposta dice, e il messaggio del backend resta disponibile per il Banner.
 */
export function normalizzaEsitoScelta(risposta) {
  const dati = risposta?.data ?? risposta;
  return {
    match: dati?.match === true,
    messaggio: typeof risposta?.message === 'string' ? risposta.message : '',
  };
}

/** L'elenco dei candidati: `{data:{candidati:[…]}}` oppure l'array nudo. */
export function normalizzaCandidati(risposta, utenteId) {
  const elenco = risposta?.data?.candidati ?? risposta?.candidati ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map((riga) => normalizzaCandidato(riga, utenteId)).filter(Boolean);
}

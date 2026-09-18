import { ApiError, apiFetch } from './client';
import { USA_DATI_FINTI } from './config';
import {
  normalizzaNotifiche,
  normalizzaOfferente,
  normalizzaPubblicazione,
  normalizzaPubblicazioni,
  normalizzaSegnalazione,
  normalizzaServizio,
  numeroInteroONull,
  testoONull,
} from './normalizzazioni';
import * as fintiAccesso from './finti/accesso';
import * as fintiCatalogo from './finti/catalogo';
import * as fintiCategorie from './finti/categorie';
import * as fintiCoda from './finti/coda';
import * as fintiMatch from './finti/match';
import * as fintiNotifiche from './finti/notifiche';
import * as fintiSegnalazioni from './finti/segnalazioni';
import * as fintiServizi from './finti/servizi';
import * as fintiToken from './finti/token';
import { SCELTE_CANDIDATO, chiaveCandidato, motivoCompatibilita } from '@/servizi/candidati';
import { aPayloadLetta } from '@/servizi/notifiche';
import {
  STATI_PUBBLICAZIONE,
  TIPI_VOCE,
  aPayloadAggiornamento,
  aPayloadPubblicazione,
  filtriDaQuery,
} from '@/servizi/offerta-ricerca';
import { aPayloadImpegno } from '@/servizi/token';

// La superficie pubblica di prima resta quella: le funzioni spostate in
// `normalizzazioni.js` si riesportano da qui, così chi le importava non cambia.
export { normalizzaPubblicazioni, normalizzaStatoPubblicazione } from './normalizzazioni';

/**
 * Dati finti o backend vero.
 *
 * Il bivio sta **qui e solo qui** (`USA_DATI_FINTI` in `config.js`), visibile e
 * grep-abile: le schermate non sanno niente dei finti, tranne al massimo un
 * `Banner` che avvisa che i dati non sono reali. Ogni ramo finto porta il suo
 * `// TODO(backend)` con l'endpoint che si aspetta.
 */

/** POST login.php — restituisce il token Bearer da riusare nelle chiamate autenticate. */
export function login(username, password) {
  if (USA_DATI_FINTI) {
    // TODO(backend): login.php vero; il token finto serve solo alla demo.
    return fintiAccesso.login(username, password);
  }
  return apiFetch('login.php', {
    method: 'POST',
    body: { username, password },
  });
}

/**
 * POST register.php — crea l'utente e lo autentica subito.
 *
 * Il corpo nuovo (`localita`, `offerte` e `ricerche` al plurale) non esiste
 * ancora nel contratto: con i finti spenti questa chiamata risponde 400 finché i
 * colleghi non aggiornano l'endpoint e non rendono facoltativo
 * `descrizione_servizio` — vedi `temp/gruppo-3-mancanti/19`.
 */
export function register(input) {
  if (USA_DATI_FINTI) {
    // TODO(backend): register.php con localita, offerte e ricerche.
    return fintiAccesso.register(input);
  }
  return apiFetch('register.php', { method: 'POST', body: input });
}

/**
 * Le categorie nella forma che serve alla UI: `[{id, nome}]`.
 *
 * Stessa normalizzazione per il finto e per il backend vero, così la schermata
 * non vede mai due forme diverse: l'id diventa numero (il confronto con
 * `idCategoria` è numerico) e le voci senza id o senza nome vengono scartate
 * invece di disegnare una tendina con righe vuote.
 */
export function normalizzaCategorie(risposta) {
  const elenco = risposta?.data?.categorie ?? risposta?.categorie;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco
    .map((categoria) => ({
      id: Number(categoria?.id),
      nome: typeof categoria?.nome === 'string' ? categoria.nome.trim() : '',
    }))
    .filter((categoria) => Number.isInteger(categoria.id) && categoria.nome !== '');
}

/**
 * GET categorie.php — le categorie della lista fissa, per le tendine.
 * In registrazione non c'è ancora una sessione, quindi `token` può essere null:
 * l'endpoint dovrà essere pubblico (domanda aperta per i colleghi).
 */
export async function ottieniCategorie(token) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET categorie.php, e la lista vera delle categorie.
    return normalizzaCategorie(await fintiCategorie.ottieniCategorie());
  }
  return normalizzaCategorie(await apiFetch('categorie.php', { token }));
}

/** POST Chat/cercaOCreaChat.php — trova o crea una chat 1:1. */
export async function cercaOCreaChat(token, utenteAttuale, membroChat) {
  const data = await apiFetch('Chat/cercaOCreaChat.php', {
    method: 'POST',
    body: { utenteAttuale, membroChat },
    token,
  });
  return Number(data.id_chat);
}

/** GET Chat/ottieniStoricoChat.php?chat=... — restituisce lo storico della chat. */
export function ottieniStoricoChat(token, chatId) {
  return apiFetch(`Chat/ottieniStoricoChat.php?chat=${chatId}`, { token });
}

/** POST Chat/inviaMessaggio.php — invia un messaggio nella chat. */
export function inviaMessaggio(token, chatId, utenteId, messaggio) {
  return apiFetch('Chat/inviaMessaggio.php', {
    method: 'POST',
    body: { chat: chatId, utente: utenteId, messaggio },
    token,
  });
}

// ---------------------------------------------------------------------------
// Offro e cerco — le proprie offerte e ricerche
//
// Endpoint proposto: `servizi.php` (elenco, creazione, modifica, stato,
// eliminazione). **Non esiste ancora**: con i finti spenti queste chiamate
// rispondono 404/405, ed è il motivo per cui ogni ramo porta il suo
// `// TODO(backend)`. La forma di rete è piatta e ha il campo `tipo` su ogni
// riga; la normalizzazione qui sotto tollera le voci salvate prima che
// `localita` e `stato` esistessero (il deposito finto della registrazione).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

/**
 * GET servizi.php — le proprie offerte e ricerche, **sospese comprese**.
 * `utenteId` serve solo al ramo finto: il finto non decodifica il token
 * (su native `atob` non è garantito), come già fa `ottieniAccordi`.
 */
export async function ottieniPubblicazioni(token, utenteId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET servizi.php → {success, message, data:{servizi:[…]}}.
    return normalizzaPubblicazioni(fintiServizi.ottieniServizi(utenteId));
  }
  return normalizzaPubblicazioni(await apiFetch('servizi.php', { token }));
}

/**
 * POST servizi.php — pubblica una nuova voce.
 * La risposta deve contenere la riga creata con il suo `id` (lezione di P37).
 */
export async function creaPubblicazione(token, utenteId, voce) {
  const corpo = aPayloadPubblicazione(voce);
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php con la riga creata e il suo id nella risposta.
    return normalizzaServizio(fintiServizi.creaServizio(utenteId, corpo));
  }
  return normalizzaServizio(
    await apiFetch('servizi.php', { method: 'POST', token, body: corpo }),
  );
}

/** POST servizi.php azione "aggiorna" — modifica categoria, mansione, remoto, località. */
export async function aggiornaPubblicazione(token, utenteId, voce) {
  const corpo = aPayloadAggiornamento(voce);
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php {azione:'aggiorna', id, …}.
    return normalizzaServizio(
      fintiServizi.aggiornaServizio(utenteId, voce.id, voce.tipo, corpo),
    );
  }
  return normalizzaServizio(
    await apiFetch('servizi.php', {
      method: 'POST',
      token,
      body: { azione: 'aggiorna', ...corpo },
    }),
  );
}

/** POST servizi.php azione "stato" — sospende o ripubblica una voce. */
export async function cambiaStatoPubblicazione(token, utenteId, id, tipo, stato) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php {azione:'stato', id, tipo, stato}.
    return normalizzaServizio(fintiServizi.cambiaStatoServizio(utenteId, id, tipo, stato));
  }
  return normalizzaServizio(
    await apiFetch('servizi.php', {
      method: 'POST',
      token,
      body: { azione: 'stato', id, tipo, stato },
    }),
  );
}

/**
 * POST servizi.php azione "elimina" — toglie la voce.
 * Cancellazione definitiva o stato «eliminata» lo decidono i colleghi: per la
 * UI il risultato è lo stesso, la voce non c'è più.
 */
export async function eliminaPubblicazione(token, utenteId, id, tipo) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST servizi.php {azione:'elimina', id, tipo}.
    fintiServizi.eliminaServizio(utenteId, id, tipo);
    return;
  }
  await apiFetch('servizi.php', {
    method: 'POST',
    token,
    body: { azione: 'elimina', id, tipo },
  });
}

// ---------------------------------------------------------------------------
// Home — il catalogo dei servizi
//
// Endpoint proposto: `GET catalogo.php` — i servizi pubblicati e attivi **di
// tutti** (le proprie voci non entrano), con i filtri in query. **Non esiste
// ancora**: con i finti spenti la home mostra l'errore del backend (404) e lo
// dichiara, senza inventare campi per far finta che funzioni.
//
// La home ha smesso di consumare `ricerca.php` e `ricercaHomepage.php`: il
// catalogo ha bisogno del `tipo`, dell'`id` e dell'`offerente`, che quegli
// endpoint non hanno, e il backend verrà rifatto comunque.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

/**
 * Il catalogo nella forma della riga della home: la voce di
 * `normalizzaPubblicazione` (che già scarta i tipi ignoti e le voci eliminate)
 * più `offerente`, meno le righe proprie e quelle non pubblicate.
 *
 * Due decisioni vivono qui e in nessun altro punto:
 * - **le proprie voci non entrano nel catalogo** (in home si vedono solo gli
 *   altri): non è una precauzione in più, è l'unico posto in cui quella scelta
 *   sta, e il frontend non si fida della query dei colleghi per una decisione
 *   che è sua;
 * - **il catalogo è dei servizi attivi**: una riga `SOSPESA` non si mostra, anche
 *   se la query dei colleghi dovesse restituirla. È difensiva, non sostitutiva.
 */
export function normalizzaCatalogo(risposta, utenteId) {
  const elenco = risposta?.data?.servizi ?? risposta?.servizi ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco
    .map((riga, indice) => {
      const voce = normalizzaPubblicazione(riga, indice);
      if (!voce || voce.stato !== STATI_PUBBLICAZIONE.PUBBLICATA) {
        return null;
      }
      const offerente = normalizzaOfferente(riga);
      if (offerente.id !== null && Number(offerente.id) === Number(utenteId)) {
        return null;
      }
      return { ...voce, offerente };
    })
    .filter(Boolean);
}

/** I filtri nella query string: le condizioni non attive si omettono. */
function queryDaFiltri(filtri) {
  const parametri = Object.entries(filtriDaQuery(filtri)).map(
    ([chiave, valore]) => `${chiave}=${encodeURIComponent(valore)}`,
  );
  return parametri.length === 0 ? '' : `?${parametri.join('&')}`;
}

/**
 * GET catalogo.php — i servizi pubblicati e attivi di tutti, filtrati.
 * `utenteId` serve al ramo finto (che non decodifica il token) e a scartare le
 * righe proprie, come fa `ottieniAccordi`.
 */
export async function ottieniCatalogo(token, utenteId, filtri) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET catalogo.php con q, id_categoria, localita, modalita.
    // Il finto ha un'attesa dichiarata, quindi si aspetta come il ramo vero.
    return normalizzaCatalogo(await fintiCatalogo.ottieniCatalogo(utenteId, filtri), utenteId);
  }
  return normalizzaCatalogo(
    await apiFetch(`catalogo.php${queryDaFiltri(filtri)}`, { token }),
    utenteId,
  );
}

// ---------------------------------------------------------------------------
// Loop — i candidati dello swipe
//
// Endpoint proposto: `Match/candidati.php`, per la **lettura** e per la
// **scrittura della scelta**. Non esiste: la Parte 20 delle segnalazioni prevede
// solo la lettura, e nemmeno quella è stata discussa. Con i finti spenti queste
// chiamate rispondono 404, ed è il motivo per cui ogni ramo porta il suo
// `// TODO(backend)`.
//
// Il frontend **non decide un match**: lo mostra solo se la risposta dice
// `match: true`. Chi entra nella pila, in che ordine e se il like è ricambiato è
// una decisione del backend.
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
function normalizzaEsitoScelta(risposta) {
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

/**
 * GET Match/candidati.php — le persone da mostrare nella pila, **già senza le
 * scelte fatte** (il filtro è del backend: il frontend non manda una lista di
 * esclusi). `utenteId` serve al ramo finto, che non decodifica il token.
 */
export async function ottieniCandidati(token, utenteId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET Match/candidati.php → {success, message, data:{candidati:[…]}}.
    return normalizzaCandidati(await fintiMatch.ottieniCandidati(utenteId), utenteId);
  }
  return normalizzaCandidati(await apiFetch('Match/candidati.php', { token }), utenteId);
}

/**
 * POST Match/candidati.php — registra «mi interessa» o «passa» su una scheda.
 *
 * La scelta riguarda **la persona e l'offerta mostrata** (`utente_id` +
 * `id_offerta`): senza i due riferimenti non c'è niente da registrare, quindi si
 * rifiuta qui invece di mandare `undefined` (lezione di P37). È una rete di
 * sicurezza: la UI disabilita già gesto e pulsanti.
 */
export async function registraSceltaCandidato(token, utenteId, utenteCandidato, idOfferta, scelta) {
  const candidatoValido = numeroInteroONull(utenteCandidato);
  const offertaValida = numeroInteroONull(idOfferta);
  if (candidatoValido === null || offertaValida === null) {
    throw new ApiError(
      400,
      'Questa scheda non ha un riferimento valido: la scelta non è registrabile.',
    );
  }

  if (USA_DATI_FINTI) {
    // TODO(backend): POST Match/candidati.php {azione:'scelta', utente_id, id_offerta, scelta}
    // con `data.match` calcolato dal backend.
    return normalizzaEsitoScelta(
      await fintiMatch.registraScelta(utenteId, candidatoValido, offertaValida, scelta),
    );
  }
  return normalizzaEsitoScelta(
    await apiFetch('Match/candidati.php', {
      method: 'POST',
      token,
      body: {
        azione: 'scelta',
        utente_id: candidatoValido,
        id_offerta: offertaValida,
        scelta,
      },
    }),
  );
}

// ---------------------------------------------------------------------------
// Coda e gruppi di match — la catena dello swipe
//
// Endpoint proposto: `Match/coda.php`, per la lettura dello stato e per l'unica
// azione dell'utente (`azione:'esci'`). **Non esiste**: la coda e i gruppi sono
// una proposta nella Parte 20 delle segnalazioni e il database non ha le tabelle.
// Con i finti spenti queste chiamate rispondono 404, ed è il motivo per cui ogni
// ramo porta il suo `// TODO(backend)`.
//
// Il frontend **non calcola la catena** e non decide esiti: legge `in_coda`, lo
// stato del gruppo e i versi dichiarati (`offre_a`). Studiare qui le
// normalizzazioni è anche il motivo per cui `useCoda` e `servizi/coda.js` non
// fanno parsing di date né di stati.
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

/**
 * GET Match/coda.php — lo stato della catena di chi chiede. `utenteId` serve al
 * ramo finto (che non decodifica il token) e a riconoscere i miei membri.
 */
export async function ottieniCoda(token, utenteId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET Match/coda.php → {success, message, data:{in_coda,
    // scadenza, gruppo, gruppi_conclusi}}; il finto ha un'attesa dichiarata.
    return normalizzaCoda(await fintiCoda.ottieniCoda(utenteId), utenteId);
  }
  return normalizzaCoda(await apiFetch('Match/coda.php', { token }), utenteId);
}

/**
 * POST Match/coda.php `{azione:'esci'}` — l'**unica** azione dell'utente su questa
 * schermata. L'identità deve venire **dal token**, mai dal corpo; il `409` (uscire
 * da una ricerca già finita) si mostra così com'è, senza interpretarlo.
 *
 * Non esiste una `entraInCoda`: la ricerca nasce dalle scelte del Loop, non da un
 * pulsante (decisione del titolare del 17 settembre 2026).
 */
export async function esciDallaCoda(token, utenteId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST Match/coda.php {azione:'esci'}.
    await fintiCoda.esciDallaCoda(utenteId);
    return;
  }
  await apiFetch('Match/coda.php', { method: 'POST', token, body: { azione: 'esci' } });
}

// ---------------------------------------------------------------------------
// Token — i buoni (non il token di accesso)
//
// Endpoint proposto: `token.php`, per l'elenco dei **propri** buoni e per
// l'unica azione dell'utente (`azione:'impegna'`). **Non esiste**: con i finti
// spenti l'elenco risponde 404, ed è il motivo per cui ogni ramo porta il suo
// `// TODO(backend)`.
//
// **Consumo e rilascio non hanno una funzione qui**: non sono azioni
// dell'utente. Il sistema porta il buono a `SPENT` quando l'accordo è concluso e
// lo riporta ad `AVAILABLE` se l'accordo salta; la schermata si limita a
// **rileggere** e a mostrare lo stato che il backend manda. La sceneggiatura del
// finto per quei due passaggi sta in `api/finti/token.js`.
//
// Nome da non confondere: `token` nei parametri è il **token di accesso**
// (l'identità viaggia lì), il buono è `buono` nella forma normalizzata.
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

/**
 * GET token.php — i **propri** buoni. `utenteId` serve solo al ramo finto: il
 * finto non decodifica il token di accesso (su native `atob` non è garantito),
 * come già fanno `ottieniAccordi` e `ottieniCoda`.
 */
export async function ottieniToken(token, utenteId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET token.php → {success, message, data:{token:[…]}}.
    return normalizzaElencoToken(await fintiToken.ottieniToken(utenteId));
  }
  return normalizzaElencoToken(await apiFetch('token.php', { token }));
}

/**
 * POST token.php `{azione:'impegna', id_token, id_servizio}` — lega un buono
 * disponibile a un servizio: da `AVAILABLE` a `RESERVED`. L'identità deve venire
 * **dal token di accesso**, mai dal corpo. Un `409` (buono già impegnato, usato o
 * scaduto) si mostra così com'è: la schermata lo lascia al `Banner`, senza
 * interpretarlo.
 */
export async function impegnaToken(token, utenteId, idToken, idServizio) {
  const corpo = aPayloadImpegno(idToken, idServizio);
  if (USA_DATI_FINTI) {
    // TODO(backend): POST token.php con l'identità dal token di accesso.
    const risposta = await fintiToken.impegnaToken(utenteId, idToken, idServizio);
    return normalizzaToken(risposta?.data?.token);
  }
  const risposta = await apiFetch('token.php', { method: 'POST', token, body: corpo });
  return normalizzaToken(risposta?.data?.token ?? risposta?.token);
}

// ---------------------------------------------------------------------------
// Segnalazioni e notifiche in-app
//
// Endpoint proposto: `segnalazioni.php` (crea, elenco per la staff, chiusura) e
// `notifiche.php` (le proprie). **Non esistono**: con i finti spenti la creazione
// risponde 404, ed è il motivo per cui ogni ramo porta il suo `// TODO(backend)`.
//
// Due decisioni che vivono qui e in nessun altro punto:
// - **l'autore non è nel corpo**: viaggia nel token di accesso, come per tutte le
//   altre scritture (lezione di P03/P05, IDOR). `utenteId` serve solo al ramo
//   finto, che non decodifica il token;
// - **una notifica non è una lettura della segnalazione**: l'utente non vede lo
//   stato della propria segnalazione (decisione del 18 settembre 2026). La
//   notifica arriva quando la staff chiude con un provvedimento, e non arriva se
//   non prende provvedimenti.
// ---------------------------------------------------------------------------

/**
 * L'esito dell'invio nella forma della schermata: la segnalazione creata e il
 * `message` del backend, già pronto per il `Banner`. Le due forme di riga
 * (segnalazione e notifica) stanno in `normalizzazioni.js`: sono pure e il file
 * degli endpoint è già oltre le 800 righe.
 */
function normalizzaEsitoInvio(risposta) {
  const dati = risposta?.data ?? risposta;
  return {
    segnalazione: normalizzaSegnalazione(dati?.segnalazione ?? dati),
    messaggio: typeof risposta?.message === 'string' ? risposta.message : '',
  };
}

/**
 * POST segnalazioni.php — invia una segnalazione alla staff. Il corpo arriva da
 * `aPayloadSegnalazione` (motivo, descrizione, riferimento e persona segnalata);
 * **chi segnala viene dal token**, mai dal corpo.
 */
export async function creaSegnalazione(token, utenteId, payload) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST segnalazioni.php `{utente_segnalato_id, motivo,
    // descrizione?, id_gruppo?, id_accordo?}`; l'autore dal token, `403` se chi
    // segnala non partecipa al fatto, `404` utente inesistente, `409` duplicato.
    return normalizzaEsitoInvio(await fintiSegnalazioni.creaSegnalazione(utenteId, payload));
  }
  return normalizzaEsitoInvio(
    await apiFetch('segnalazioni.php', { method: 'POST', token, body: payload }),
  );
}

/**
 * GET notifiche.php — le **proprie** notifiche. `utenteId` serve solo al ramo
 * finto, che non decodifica il token di accesso (come `ottieniToken`).
 */
export async function ottieniNotifiche(token, utenteId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET notifiche.php → {success, message, data:{notifiche:[…]}}.
    return normalizzaNotifiche(await fintiNotifiche.ottieniNotifiche(utenteId));
  }
  return normalizzaNotifiche(await apiFetch('notifiche.php', { token }));
}

/**
 * POST notifiche.php `{id}` — segna una notifica come letta. Il `403` (non è mia)
 * e il `404` si mostrano così com'è; l'avviso si chiude comunque, perché è un
 * avviso, non una pratica. `utenteId` serve al ramo finto, come sopra.
 */
export async function segnaNotificaLetta(token, utenteId, id) {
  const corpo = aPayloadLetta(id);
  if (USA_DATI_FINTI) {
    // TODO(backend): POST notifiche.php con l'identità dal token di accesso.
    await fintiNotifiche.segnaNotificaLetta(utenteId, id);
    return;
  }
  await apiFetch('notifiche.php', { method: 'POST', token, body: corpo });
}

/** POST inviti.php azione "genera" — crea (o restituisce) il codice invito del mese. */
export function generaInvito(token) {
  return apiFetch('inviti.php', {
    method: 'POST',
    body: { azione: 'genera' },
    token,
  });
}

/** POST inviti.php azione "riscatta" — usa un codice invito ricevuto. */
export function riscattaInvito(token, codice) {
  return apiFetch('inviti.php', {
    method: 'POST',
    body: { azione: 'riscatta', codice },
    token,
  });
}

// ---------------------------------------------------------------------------
// Accordi 1:1 — API/Accordi1_a_1/
//
// La busta di questa cartella è {success, message, data} e gli id viaggiano nel
// corpo per le azioni e nella query string per le letture. Le risposte vengono
// adattate qui (§4 del piano): le schermate non leggono chiavi del backend.
// ---------------------------------------------------------------------------

/**
 * Aggiunge all'accordo ciò che il backend non manda: chi sono io, chi è l'altro.
 * Copia-trasforma-restituisce: l'accordo di risposta non viene mai mutato.
 */
function normalizzaAccordo(accordo, utenteId) {
  if (!accordo || !Array.isArray(accordo.partecipanti)) {
    return accordo;
  }
  const io =
    accordo.partecipanti.find((p) => Number(p.id_utente) === Number(utenteId)) ?? null;
  const altro =
    accordo.partecipanti.find((p) => Number(p.id_utente) !== Number(utenteId)) ?? null;
  return { ...accordo, io, altro };
}

/** GET Accordi1_a_1/elenco.php — gli accordi dell'utente, normalizzati per la UI. */
export async function ottieniAccordi(token, utenteId) {
  const data = await apiFetch('Accordi1_a_1/elenco.php', { token });
  return (data?.data ?? []).map((accordo) => normalizzaAccordo(accordo, utenteId));
}

/** GET Accordi1_a_1/dettaglio.php?id_accordo= — un accordo, normalizzato per la UI. */
export async function ottieniAccordo(token, idAccordo, utenteId) {
  const data = await apiFetch(
    `Accordi1_a_1/dettaglio.php?id_accordo=${encodeURIComponent(idAccordo)}`,
    { token },
  );
  return normalizzaAccordo(data?.data, utenteId);
}

/**
 * POST Accordi1_a_1/crea.php — propone un accordo 1:1 a un altro utente.
 * Restituisce l'id dell'accordo creato, già come numero: serve alla navigazione
 * verso il dettaglio e un id stringa farebbe fallire i confronti con `===`.
 */
export async function creaAccordo(token, idAltroUtente, durataMia, durataAltro) {
  const data = await apiFetch('Accordi1_a_1/crea.php', {
    method: 'POST',
    token,
    body: {
      id_altro_utente: idAltroUtente,
      durata_mia: durataMia,
      durata_altro: durataAltro,
    },
  });
  return Number(data?.data?.id_accordo);
}

/** Le cinque azioni che condividono corpo `{id_accordo}` e stessa forma di risposta. */
const PERCORSI_AZIONE_ACCORDO = {
  accetta: 'Accordi1_a_1/accetta.php',
  avvia: 'Accordi1_a_1/avvia.php',
  completa: 'Accordi1_a_1/completa.php',
  annulla: 'Accordi1_a_1/annulla.php',
  contesta: 'Accordi1_a_1/contesta.php',
};

/**
 * POST Accordi1_a_1/<azione>.php — un solo corpo per le cinque azioni, un solo
 * esito normalizzato per la schermata:
 * - `messaggio`: il testo del backend (che in questa cartella sta in `message`,
 *   non in `errore`), già pronto da mostrare;
 * - `stato`: lo stato raggiunto, quando il backend lo restituisce.
 */
async function eseguiAzioneAccordo(token, azione, idAccordo) {
  const percorso = PERCORSI_AZIONE_ACCORDO[azione];
  if (!percorso) {
    throw new Error(`Azione su accordo sconosciuta: ${azione}`);
  }
  const data = await apiFetch(percorso, {
    method: 'POST',
    token,
    body: { id_accordo: idAccordo },
  });
  return {
    messaggio: typeof data?.message === 'string' ? data.message : '',
    stato: data?.data?.stato ?? null,
  };
}

/** POST Accordi1_a_1/accetta.php — registra la mia accettazione di una proposta. */
export function accettaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'accetta', idAccordo);
}

/** POST Accordi1_a_1/avvia.php — porta in esecuzione un accordo accettato da entrambi. */
export function avviaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'avvia', idAccordo);
}

/** POST Accordi1_a_1/completa.php — registra il mio completamento (vedi sopra). */
export function completaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'completa', idAccordo);
}

/** POST Accordi1_a_1/annulla.php — chiude un accordo proposto o accettato. */
export function annullaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'annulla', idAccordo);
}

/** POST Accordi1_a_1/contesta.php — contesta un accordo in esecuzione. */
export function contestaAccordo(token, idAccordo) {
  return eseguiAzioneAccordo(token, 'contesta', idAccordo);
}

/**
 * Mappa azione -> funzione del layer API, con le stesse chiavi di `AZIONI` in
 * `src/accordi/stati.js`: la schermata del dettaglio esegue quello che la logica
 * pura le dice di mostrare, senza uno `switch` sui nomi delle azioni.
 */
export const AZIONI_ACCORDO_API = {
  accetta: accettaAccordo,
  avvia: avviaAccordo,
  completa: completaAccordo,
  annulla: annullaAccordo,
  contesta: contestaAccordo,
};

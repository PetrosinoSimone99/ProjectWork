import { ApiError, apiFetch } from '../client';
import {
  normalizzaOfferente,
  normalizzaPubblicazione,
  numeroInteroONull,
} from '../normalizzazioni';
import { DECISIONI_PROPOSTA, MOTIVI_COMPATIBILITA, SCELTE_CANDIDATO } from '@/servizi/candidati';
import { TIPI_VOCE } from '@/servizi/offerta-ricerca';
import { registraVociDaRigaFeed } from './catene';

/**
 * Area «Loop»: il feed dello swipe (`GET /api/swipes`), la scelta su una scheda
 * (`POST /api/swipes`) e la decisione su una proposta in attesa
 * (`POST /api/proposals/{id}/decision`) del backend Symfony
 * (`MarketplaceController`, PR #23/24).
 *
 * Nasce come gli altri file di `aree/` (P53): le funzioni nuove non ingrossano
 * `barattolo.js`, e la conversione forma interna ↔ contratto vive **qui**, mai
 * nelle schermate (§3 di `AGENTS.md`). `barattolo.js` re-espone i tre nomi.
 *
 * Il contratto del backend è **diverso** da quello finto che c'era prima: non
 * lavora su `utente_id`/`id_offerta` ma su **quattro id di servizi** (i miei due
 * più i suoi due), e il match non si deduce: `swipe RIGHT → proposta PENDING →
 * l'altro decide → matched: true`. Qui cadono anche i finti dello swipe: con
 * `USA_DATI_FINTI` attivo queste chiamate si fermano alla guardia di `client.js`
 * e la schermata dice che la sezione non è disponibile, invece di mostrare un
 * match inventato.
 *
 * Sulla compatibilità dei candidati: il feed contiene **solo** coppie con la
 * categoria condivisa nelle due direzioni (`sharesCategory` chiamata su entrambi
 * i versi, vedi il controller), quindi ogni scheda ha motivo `ENTRAMBI`. Non è
 * un testo inventato: è la regola con cui il server compone il feed.
 *
 * Una riga che non si può usare (persona senza id, servizio senza id, uno dei
 * quattro id mancanti) **non entra nella lista**: la UI non mostra schede su cui
 * la scelta non è registrabile, e non inventa righe di testo al loro posto.
 */

/** Il default del backend per `limit`, dichiarato anche qui per la validazione. */
const LIMITE_DEFAULT = 20;

/** I margini accettati da `GET /api/swipes?limit=` (1..50, vedi il controller). */
const LIMITE_MINIMO = 1;
const LIMITE_MASSIMO = 50;

/**
 * Le scelte della UI (`INTERESSE`/`PASSA`) nelle direzioni del contratto
 * (`RIGHT`/`LEFT`). La conversione sta **qui** (vincolo 4 del piano): nessun
 * componente scrive mai le parole del backend.
 */
const DIREZIONI = {
  [SCELTE_CANDIDATO.INTERESSE]: 'RIGHT',
  [SCELTE_CANDIDATO.PASSA]: 'LEFT',
};

/**
 * I messaggi italiani per gli status che hanno un significato preciso sulle
 * due scritture. Sono espliciti e senza dettagli tecnici: il testo inglese del
 * backend non arriva a schermo (stessa regola di `aree/servizi.js`).
 */
const MESSAGGI_SCELTA = {
  400: 'Questa scheda non è valida: la scelta non è registrata.',
  404: 'Questa scheda non è più disponibile.',
  409: 'Hai già deciso per questa scheda: al prossimo caricamento non sarà più qui.',
};

const MESSAGGI_DECISIONE = {
  400: 'La decisione non è valida.',
  403: 'Questa proposta attende la decisione di un altro utente.',
  404: 'Questa proposta non esiste più.',
  409: 'Questa proposta è già stata decisa.',
};

/**
 * Rilancia l'errore con il messaggio italiano della tabella. Gli status non
 * mappati (401 della sessione, rete assente, timeout, 5xx) passano immutati:
 * sono già gestiti o già generici per conto di `client.js`.
 */
async function conMessaggi(chiamata, mappa) {
  try {
    return await chiamata;
  } catch (err) {
    if (err instanceof ApiError && mappa[err.status]) {
      throw new ApiError(err.status, mappa[err.status]);
    }
    throw err;
  }
}

/** La query del feed: `?limit=` solo quando il valore è nel range del contratto. */
function queryLimite(limite) {
  const valore = numeroInteroONull(limite);
  if (valore === null || valore < LIMITE_MINIMO || valore > LIMITE_MASSIMO) {
    return '';
  }
  return `?limit=${valore}`;
}

/**
 * Un servizio del contratto (`Service::toApiArray`: `{id, type, description,
 * categories}`) nella forma della voce interna (`servizi/offerta-ricerca.js`),
 * che è quella che la scheda disegna già.
 *
 * Il contratto del servizio **non modella** né la modalità (da remoto / in
 * presenza) né la località dell'annuncio: `daRemoto` resta `null` e `localita`
 * vuota, così la scheda non mostra la riga invece di dichiarare «in presenza»
 * un dato che non esiste (vincolo 4 del piano). La categoria è la prima delle
 * categorie del servizio: il contratto ne manda un elenco e la voce interna ne
 * porta una.
 */
function aVoceDaServizio(servizio, tipo) {
  if (!servizio || typeof servizio !== 'object') {
    return null;
  }
  const id = numeroInteroONull(servizio.id);
  if (id === null) {
    return null;
  }
  const categorie = Array.isArray(servizio.categories) ? servizio.categories : [];
  const voce = normalizzaPubblicazione({
    tipo,
    id,
    id_categoria: numeroInteroONull(categorie[0]?.id),
    mansione: typeof servizio.description === 'string' ? servizio.description : '',
  });
  if (!voce) {
    return null;
  }
  return { ...voce, daRemoto: null };
}

/**
 * I quattro id di servizi di una riga del feed, nella forma interna
 * (`{offertaMia, richiestaMia, offertaSua, richiestaSua}` → i campi
 * `actorOfferServiceId`, `actorRequestServiceId`, `candidateOfferServiceId`,
 * `candidateRequestServiceId` del contratto). `null` se anche uno solo manca:
 * senza tutti e quattro la scelta non è registrabile e la scheda non esiste.
 */
function idServiziDaRiga(riga) {
  const idServizi = {
    offertaMia: numeroInteroONull(riga?.actorOfferService?.id),
    richiestaMia: numeroInteroONull(riga?.actorRequestService?.id),
    offertaSua: numeroInteroONull(riga?.candidateOfferService?.id),
    richiestaSua: numeroInteroONull(riga?.candidateRequestService?.id),
  };
  return Object.values(idServizi).some((id) => id === null) ? null : idServizi;
}

/** La chiave di una scheda: la **combinazione dei quattro servizi**. */
function chiaveScheda(idServizi) {
  const { offertaMia, richiestaMia, offertaSua, richiestaSua } = idServizi;
  return `candidato-${offertaMia}-${richiestaMia}-${offertaSua}-${richiestaSua}`;
}

/**
 * Una riga di `candidates` nella forma della scheda
 * (`{chiave, persona, offerta, ricerca, motivo, tiHaScelto, idServizi}` — le
 * prime sei chiavi sono la forma che la UI disegna da sempre, `idServizi`
 * serve a registrare la scelta). Costruita con **whitelist esplicita**: la riga
 * del backend porta anche `bio` e `profileImageUrl`, che non devono arrivare a
 * schermo per sbaglio.
 *
 * `tiHaScelto` è `null`: il contratto non dice più «questa persona ti ha messo
 * like» — il like ricevuto ora è una **proposta in attesa**, che ha la sua
 * sezione. La riga «Ti ha messo like» della scheda resta per la forma, e non
 * compare finché il valore non è `true`.
 */
function normalizzaCandidato(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }

  // `normalizzaOfferente` legge l'autore **annidato** (`offerente`/`owner`):
  // la riga del feed manda la persona piatta (`toPublicApiArray`), quindi si
  // presenta annidata per farla leggere alla stessa funzione di prima.
  const persona = normalizzaOfferente({ offerente: riga.candidate });
  if (persona.id === null) {
    return null;
  }

  const offerta = aVoceDaServizio(riga.candidateOfferService, TIPI_VOCE.OFFERTA);
  const ricerca = aVoceDaServizio(riga.candidateRequestService, TIPI_VOCE.RICERCA);
  if (!offerta || !ricerca) {
    return null;
  }

  const idServizi = idServiziDaRiga(riga);
  if (!idServizi) {
    return null;
  }

  return {
    chiave: chiaveScheda(idServizi),
    persona,
    offerta,
    ricerca,
    // Il feed contiene solo compatibilità **reciproche** (entrambe le direzioni,
    // vedi `sharesCategory` nel controller): è il motivo per cui la scheda è qui.
    motivo: MOTIVI_COMPATIBILITA.ENTRAMBI,
    tiHaScelto: null,
    idServizi,
  };
}

/**
 * L'elenco dei candidati del feed: `{"candidates": [...]}`. Una risposta senza
 * elenco (o con righe inutilizzabili) diventa lista vuota: la schermata mostra
 * il suo stato vuoto, non righe inventate.
 *
 * Ogni riga dichiara anche i **due servizi miei** (`actorOfferService` e
 * `actorRequestService`, con i loro id): sono una sorgente reale del registro
 * delle mie voci (vincolo 14 del piano 05-catene), alimentato qui «best
 * effort» — solo righe con id leggibili, mai inventate.
 */
export function normalizzaCandidati(risposta, utenteId) {
  const elenco = risposta?.candidates;
  if (!Array.isArray(elenco)) {
    return [];
  }
  if (utenteId !== null && utenteId !== undefined) {
    for (const riga of elenco) {
      registraVociDaRigaFeed(utenteId, riga);
    }
  }
  return elenco.map(normalizzaCandidato).filter(Boolean);
}

/**
 * Una riga di `pendingProposals` nella proposta della UI: `{id, persona,
 * servizio}` — l'**altro** partecipante e il servizio che lui offre.
 *
 * La proposta arriva in questo elenco solo quando è **la mia** la conferma in
 * attesa (il feed filtra su `confirmed: false` di chi chiede), quindi l'altro è
 * il partecipante già confermato. Se l'altro non si riconosce (nessun
 * confermato, senza persona o senza servizio) la riga non si mostra.
 */
function normalizzaProposta(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const partecipanti = Array.isArray(riga.participants) ? riga.participants : [];
  const altro = partecipanti.find((partecipante) => partecipante?.confirmed === true);
  if (!altro) {
    return null;
  }
  const persona = normalizzaOfferente({ offerente: altro.user });
  if (persona.id === null) {
    return null;
  }
  const servizio = aVoceDaServizio(altro.service, TIPI_VOCE.OFFERTA);
  if (!servizio) {
    return null;
  }
  return { id, persona, servizio };
}

/** L'elenco delle proposte in attesa della mia decisione: `pendingProposals`. */
export function normalizzaProposteInAttesa(risposta) {
  const elenco = risposta?.pendingProposals;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaProposta).filter(Boolean);
}

/**
 * L'esito di una scelta nella forma della UI. `match` qui è **sempre** `false`:
 * uno swipe crea (o non crea) una proposta, non un match — «È un match!» nasce
 * solo dal `matched` della decisione (vincolo 2 del piano). `propostaId` è
 * quello della proposta creata dal `RIGHT` (su `LEFT` è `null` per contratto).
 */
export function normalizzaEsitoScelta(risposta) {
  return {
    match: false,
    propostaId: numeroInteroONull(risposta?.proposalId),
  };
}

/**
 * L'esito di una decisione nella forma della UI: `match` è **solo** quello che
 * il backend dice con `matched`, mai dedotto. Se la risposta non porta l'id
 * della proposta resta quello che si era chiesto: è la stessa proposta.
 */
export function normalizzaEsitoDecisione(risposta, id) {
  return {
    match: risposta?.matched === true,
    propostaId: numeroInteroONull(risposta?.proposal?.id) ?? numeroInteroONull(id),
  };
}

/**
 * GET /api/swipes — il feed di «Loop»: le proposte in attesa della mia
 * decisione e i candidati compatibili, già senza le coppie già decise (filtro
 * del backend: il frontend non manda una lista di esclusi).
 *
 * `limite` è il `limit` del contratto (1..50, default 20): fuori range il
 * parametro non si manda e vale il default del backend. `utenteId` serve solo
 * ad alimentare il registro delle mie voci dalle righe del feed: senza, il
 * registro non si tocca (e la scelta non cambia).
 */
export async function ottieniFeedSwipes(token, limite = LIMITE_DEFAULT, utenteId = null) {
  const risposta = await apiFetch(`swipes${queryLimite(limite)}`, { token });
  return {
    candidati: normalizzaCandidati(risposta, utenteId),
    proposte: normalizzaProposteInAttesa(risposta),
  };
}

/**
 * POST /api/swipes — registra la scelta su una scheda.
 *
 * `scelta` è nella forma interna: `{scelta: 'INTERESSE'|'PASSA', idServizi:
 * {offertaMia, richiestaMia, offertaSua, richiestaSua}}`. La conversione nelle
 * parole del contratto (`direction` + i quattro `*ServiceId`) sta qui. Le
 * guardie sono difensive: la schermata disabilita gesti e pulsanti già prima
 * dell'invio, e il feed non manda schede senza i quattro id.
 *
 * La ripetizione della stessa direzione è sicura per contratto (torna il
 * risultato esistente); una direzione **diversa** sulla stessa combinazione
 * risponde `409`, che arriva alla schermata col messaggio esplicito di sopra.
 */
export async function registraScelta(token, scelta) {
  const direzione = DIREZIONI[scelta?.scelta];
  const idServizi = scelta?.idServizi ?? {};
  const { offertaMia, richiestaMia, offertaSua, richiestaSua } = idServizi;
  const idValidi = [offertaMia, richiestaMia, offertaSua, richiestaSua].map(numeroInteroONull);
  if (!direzione || idValidi.some((id) => id === null)) {
    throw new ApiError(400, MESSAGGI_SCELTA[400]);
  }

  return normalizzaEsitoScelta(
    await conMessaggi(
      apiFetch('swipes', {
        method: 'POST',
        token,
        body: {
          direction: direzione,
          actorOfferServiceId: offertaMia,
          actorRequestServiceId: richiestaMia,
          candidateOfferServiceId: offertaSua,
          candidateRequestServiceId: richiestaSua,
        },
      }),
      MESSAGGI_SCELTA,
    ),
  );
}

/**
 * POST /api/proposals/{id}/decision — accetta o rifiuta una proposta in attesa.
 *
 * `decisione` è uno dei due valori del contratto (`DECISIONI_PROPOSTA` in
 * `servizi/candidati.js`: `ACCEPT`/`REJECT`), e solo il partecipante che non ha
 * ancora confermato può deciderlo: gli altri casi arrivano come `403`. La
 * risposta porta `matched`, che è **l'unico** modo in cui il frontend può dire
 * «È un match!».
 */
export async function decidiProposta(token, id, decisione) {
  const idValido = numeroInteroONull(id);
  const decisioneValida =
    decisione === DECISIONI_PROPOSTA.ACCETTA || decisione === DECISIONI_PROPOSTA.RIFIUTA
      ? decisione
      : null;
  if (idValido === null || !decisioneValida) {
    throw new ApiError(400, MESSAGGI_DECISIONE[400]);
  }

  return normalizzaEsitoDecisione(
    await conMessaggi(
      apiFetch(`proposals/${idValido}/decision`, {
        method: 'POST',
        token,
        body: { decision: decisioneValida },
      }),
      MESSAGGI_DECISIONE,
    ),
    idValido,
  );
}

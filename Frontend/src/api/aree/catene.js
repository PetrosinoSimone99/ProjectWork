import { ApiError, apiFetch } from '../client';
import { numeroInteroONull, testoONull } from '../normalizzazioni';
import { ottieniBuoni } from './token';
import { TIPI_VOCE } from '@/servizi/offerta-ricerca';
import { aggiungiMiaVoce } from '@/servizi/mie-voci';
import { decisioneAlContratto, vistaCatena } from '@/servizi/catene';

/**
 * Area «Catene»: il ciclo di vita completo del contratto reale
 * (`POST|GET /api/chains`, `POST /api/chains/{id}/…` e `GET /api/tokens`,
 * PR #29 — `ChainController` + `ChainService`).
 *
 * Nasce come gli altri file di `aree/` (P53): le funzioni nuove non ingrossano
 * `barattolo.js` (che qui si **assottiglia**, perché la coda finta esce di
 * scena), e la conversione forma interna ↔ contratto vive **qui**, mai nelle
 * schermate (§3 di `AGENTS.md`). `barattolo.js` re-espone i nomi.
 *
 * Nessun finto per questa area: con `USA_DATI_FINTI` attivo le chiamate si
 * fermano alla guardia di `client.js` e la schermata dice cosa manca. Il
 * normalizzatore di `normalizzaCandidati` (`aree/loop.js`) alimenta il registro
 * delle mie voci; qui la cosa non serve: la ricerca si avvia con una coppia di
 * id già in mano.
 *
 * Le parole del backend (`ACCEPT`/`REJECT`, gli stati, i motivi) **non escono**
 * da questo file: entrano `DECISIONI_CATENA` e le costanti di stato di
 * `servizi/catene.js`, e le decisioni della UI tornano qui per essere tradotte.
 * Un valore di lifecycle ignoto passa **grezzo** alla UI (vista neutra), mai
 * tradotto a caso.
 */

// ---------------------------------------------------------------------------
// I messaggi italiani per gli status che hanno un significato preciso.
// Il testo inglese del backend non arriva a schermo (stessa regola di
// `aree/loop.js`); gli status non mappati passano immutati: sono già gestiti
// o già generici per conto di `client.js`.
// ---------------------------------------------------------------------------

/**
 * Il `409` di `POST /api/chains` ha **due** significati distinti, e la UI li
 * distingue: servizi impegnati in un'altra catena (`The selected services are
 * reserved by another chain.`) oppure match diretto disponibile
 * (`A direct candidate or active direct proposal is available.`, retryabile di
 * fatto: finché il candidato diretto c'è, la catena non serve). Si distinguono
 * dal messaggio verbatim del backend, dentro questo file e solo qui.
 */
const RISPOSTA_409_SERVIZI_IMPEGNATI = 'The selected services are reserved by another chain.';
const RISPOSTA_409_MATCH_DIRETTO = 'A direct candidate or active direct proposal is available.';

export const MESSAGGI_AVVIO = {
  400: 'Le voci scelte non sono valide per avviare questa ricerca.',
  404: 'Una delle voci scelte non esiste più.',
  409: "Le tue voci sono già impegnate in un'altra catena: finché quella non conclude o salta, non si possono usare qui.",
};

/** Il messaggio italiano del `409` «c'è un match diretto»: la UI ci attacca il pulsante «Vai al Loop». */
export const MESSAGGIO_MATCH_DIRETTO =
  'C\'è un match diretto per questa coppia: vai al Loop.';

const MESSAGGI_CONFERMA = {
  400: 'La decisione non è valida.',
  403: 'Questa catena non accetta una tua decisione.',
  404: 'Questa catena non esiste più.',
  409: 'La catena è cambiata nel frattempo: ho riletto lo stato.',
};

const MESSAGGI_CONDIZIONI = {
  400: 'Controlla i dati: luogo, data o ora non sono validi.',
  403: 'Solo chi propone le condizioni di questo arco può crearle.',
  404: 'Questa catena non esiste più.',
  409: 'Queste condizioni non si possono creare adesso: ho riletto lo stato.',
};

const MESSAGGI_DECISIONE_CONDIZIONI = {
  400: 'La decisione non è valida.',
  403: 'Solo chi riceve il servizio può accettare o rifiutare queste condizioni.',
  404: 'Queste condizioni non esistono più.',
  409: 'Le condizioni sono già state decise, o la catena è cambiata: ho riletto lo stato.',
};

const MESSAGGI_RICEZIONE = {
  403: 'Solo chi riceve il servizio può confermarne la ricezione.',
  404: 'Questa catena non esiste più.',
  409: 'La catena è cambiata nel frattempo: ho riletto lo stato.',
};

const MESSAGGI_ANNULLAMENTO = {
  400: 'Scrivi un motivo di 1–255 caratteri.',
  403: 'Solo chi ha aperto la ricerca può annullarla prima che il ciclo sia proposto.',
  404: 'Questa catena non esiste più.',
  409: "L'annullamento non è registrato: la catena è cambiata nel frattempo. Ho riletto lo stato.",
};

/**
 * Rilancia l'errore con il messaggio italiano della tabella. Il `409`
 * *concorrenza* (`A concurrent operation changed these services. Retry the
 * request.`) è **retryabile**: il messaggio generico del 409 dice già di aver
 * riletto lo stato, che è esattamente la prescrizione del contratto.
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

/** `true` quando un `409` dell'avvio dice che la coppia ha un match diretto. */
export function isErroreMatchDiretto(err) {
  return (
    err instanceof ApiError &&
    err.status === 409 &&
    err.message === MESSAGGIO_MATCH_DIRETTO
  );
}

/**
 * Il `409` dell'avvio, distinto per significato: si legge il messaggio verbatim
 * del backend **qui e solo qui**, e si rilancia col messaggio italiano giusto.
 * Qualsiasi altro testo di `409` cade sul caso «servizi impegnati», che è la
 * situazione generale in cui una ricerca può essere bloccata.
 */
async function conMessaggiAvvio(chiamata) {
  try {
    return await chiamata;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      if (err.message === RISPOSTA_409_MATCH_DIRETTO) {
        throw new ApiError(409, MESSAGGIO_MATCH_DIRETTO);
      }
      if (err.message !== RISPOSTA_409_SERVIZI_IMPEGNATI) {
        // Un `409` non dichiarato dal contratto non si maschera: passa immutato
        // e la schermata mostra il messaggio generico di `client.js`.
        throw err;
      }
    }
    if (err instanceof ApiError && MESSAGGI_AVVIO[err.status]) {
      throw new ApiError(err.status, MESSAGGI_AVVIO[err.status]);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Persone: la whitelist della forma pubblica (`User::toPublicApiArray`)
// ---------------------------------------------------------------------------

/**
 * La persona pubblica di una riga del contratto (`user`: `{id, name, surname,
 * username, location, bio, profileImageUrl}`): whitelist esplicita — `bio` e
 * l'immagine non devono arrivare a schermo per sbaglio. Restituisce `null` se
 * la riga non ha un id: una persona senza id non si disegna.
 */
function normalizzaPersonaPubblica(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  return {
    id,
    nome: testoONull(riga.name),
    cognome: testoONull(riga.surname),
    username: testoONull(riga.username),
    localita: testoONull(riga.location),
  };
}

/**
 * La persona di un partecipante dell'elenco **già normalizzato** (le condizioni e
 * le prestazioni portano solo gli id), o una persona «vuota» con l'id: il nome
 * non si inventa, e l'assenza si vede («Utente» di `nomePersona`).
 */
function personaDaId(partecipantiNormalizzati, utenteIdCercato) {
  const trovato = (Array.isArray(partecipantiNormalizzati) ? partecipantiNormalizzati : []).find(
    (partecipante) =>
      partecipante?.persona?.id !== null &&
      Number(partecipante.persona.id) === Number(utenteIdCercato),
  );
  return (
    trovato?.persona ?? {
      id: numeroInteroONull(utenteIdCercato),
      nome: null,
      cognome: null,
      username: null,
      localita: null,
    }
  );
}

/**
 * Una stringa ISO del backend (`DATE_ATOM`) in epoch millisecondi per il conto
 * alla rovescia, oppure `null` se assente o illeggibile. Le stringhe ISO
 * originali restano il dato: la UI le mostra formattate, non le ricalcola.
 */
function epochDaIso(valore) {
  if (typeof valore !== 'string' || valore.trim() === '') {
    return null;
  }
  const millisecondi = Date.parse(valore);
  return Number.isFinite(millisecondi) ? millisecondi : null;
}

// ---------------------------------------------------------------------------
// Normalizzatori: dal contratto alla forma interna della UI (vincolo 2)
// ---------------------------------------------------------------------------

/** La chiave di un partecipante: unica per catena, derivata dall'id utente. */
function chiavePartecipante(idUtente) {
  return `partecipante-${idUtente}`;
}

/** La chiave di una condizione (agreement) o di una prestazione (provision). */
const chiaveDi = (prefisso, id) => `${prefisso}-${id}`;

/**
 * Un partecipante nella forma della UI. `decisione` resta **grezzo**
 * (`ACCEPT`/`REJECT`/null): lo legge `etichettaDecisione`. I versi
 * (`offreAChiave`/`riceveDaChiave`) si calcolano **solo** dai `links` della
 * catena, mai dedotti dall'ordine.
 */
function normalizzaPartecipante(riga, utenteId) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const persona = normalizzaPersonaPubblica(riga.user);
  if (persona === null) {
    return null;
  }
  return {
    chiave: chiavePartecipante(persona.id),
    posizione: numeroInteroONull(riga.position),
    persona,
    sonoIo:
      utenteId !== null && utenteId !== undefined && Number(persona.id) === Number(utenteId),
    decisione: typeof riga.decision === 'string' ? riga.decision : null,
    confermatoIl: testoONull(riga.confirmedAt),
    offreAChiave: null,
    riceveDaChiave: null,
  };
}

/**
 * Una condizione (gli `agreements` del contratto: le condizioni di **un arco**,
 * provider → beneficiario) nella forma della UI. `stato` resta grezzo;
 * `inizio` è la stringa ISO del backend, che la UI mostra formattata.
 */
function normalizzaCondizioni(riga, partecipanti, utenteId) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const idProvider = numeroInteroONull(riga.providerUserId);
  const idBeneficiario = numeroInteroONull(riga.recipientUserId);
  return {
    chiave: chiaveDi('condizioni', id),
    id,
    sonoProvider:
      utenteId !== null && utenteId !== undefined && Number(idProvider) === Number(utenteId),
    sonoBeneficiario:
      utenteId !== null && utenteId !== undefined && Number(idBeneficiario) === Number(utenteId),
    provider: personaDaId(partecipanti, idProvider),
    beneficiario: personaDaId(partecipanti, idBeneficiario),
    luogo: testoONull(riga.location),
    inizio: testoONull(riga.startAt),
    stato: typeof riga.status === 'string' ? riga.status : null,
    creatoIl: testoONull(riga.createdAt),
    decisoIl: testoONull(riga.decidedAt),
  };
}

/**
 * Una prestazione (`provisions`: la consegna creata dall'accettazione delle
 * condizioni) nella forma della UI. `ricevutoIl` è la prova del backend: senza,
 * la ricezione è ancora da fare — non si deduce da `expectedIncomingServiceId`.
 */
function normalizzaPrestazione(riga, partecipanti, utenteId) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const idProvider = numeroInteroONull(riga.providerUserId);
  const idBeneficiario = numeroInteroONull(riga.recipientUserId);
  return {
    chiave: chiaveDi('prestazione', id),
    id,
    idCondizioni: numeroInteroONull(riga.agreementId),
    provider: personaDaId(partecipanti, idProvider),
    beneficiario: personaDaId(partecipanti, idBeneficiario),
    sonoBeneficiario:
      utenteId !== null && utenteId !== undefined && Number(idBeneficiario) === Number(utenteId),
    luogo: testoONull(riga.location),
    inizio: testoONull(riga.startAt),
    ricevutoIl: testoONull(riga.receivedAt),
    ricevutoDa: numeroInteroONull(riga.receivedByUserId),
  };
}

/**
 * Una catena nella forma della UI (vincolo 2 del piano). Una riga senza id non
 * si può mostrare né usare in un'azione: si scarta, non si inventa.
 */
export function normalizzaCatena(riga, utenteId) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const partecipanti = (Array.isArray(riga.participants) ? riga.participants : [])
    .map((partecipante) => normalizzaPartecipante(partecipante, utenteId))
    .filter(Boolean);

  // I versi dichiarati: `links` porta `providerUserId → recipientUserId`. Se un
  // verso manca, la UI non disegna frecce e non deduce.
  for (const arco of Array.isArray(riga.links) ? riga.links : []) {
    const idProvider = numeroInteroONull(arco?.providerUserId);
    const idBeneficiario = numeroInteroONull(arco?.recipientUserId);
    if (idProvider === null || idBeneficiario === null) {
      continue;
    }
    const provider = partecipanti.find(
      (partecipante) => Number(partecipante.persona.id) === Number(idProvider),
    );
    if (provider && provider.offreAChiave === null) {
      provider.offreAChiave = chiavePartecipante(idBeneficiario);
    }
    const beneficiario = partecipanti.find(
      (partecipante) => Number(partecipante.persona.id) === Number(idBeneficiario),
    );
    if (beneficiario && beneficiario.riceveDaChiave === null) {
      beneficiario.riceveDaChiave = chiavePartecipante(idProvider);
    }
  }

  const idAnnullamento = numeroInteroONull(riga.cancelledByUserId);
  const annullata =
    idAnnullamento === null
      ? null
      : {
          daUtenteId: idAnnullamento,
          persona: personaDaId(partecipanti, idAnnullamento),
          // Il motivo resta **grezzo**: lo traduce `etichettaMotivoAnnullamento`
          // alla card, e un valore ignoto (o testo libero) si mostra così com'è.
          motivo: testoONull(riga.cancellationReason),
          quando: testoONull(riga.cancelledAt),
        };

  const stato = typeof riga.status === 'string' ? riga.status : null;
  return {
    chiave: `catena-${id}`,
    id,
    stato,
    vista: vistaCatena({ stato }),
    sonoInitiator: Number(riga.initiatorUserId) === Number(utenteId),
    apertaDa: personaDaId(partecipanti, numeroInteroONull(riga.initiatorUserId)),
    createdAt: testoONull(riga.createdAt),
    proposedAt: testoONull(riga.proposedAt),
    completedAt: testoONull(riga.completedAt),
    cancelledAt: testoONull(riga.cancelledAt),
    scadenzaRicercaMs: epochDaIso(riga.searchDeadline),
    scadenzaConfermeMs: epochDaIso(riga.confirmationDeadline),
    scadenzaRicerca: testoONull(riga.searchDeadline),
    scadenzaConferme: testoONull(riga.confirmationDeadline),
    annullata,
    partecipanti,
    condizioni: (Array.isArray(riga.agreements) ? riga.agreements : [])
      .map((condizioni) => normalizzaCondizioni(condizioni, partecipanti, utenteId))
      .filter(Boolean),
    prestazioni: (Array.isArray(riga.provisions) ? riga.provisions : [])
      .map((prestazione) => normalizzaPrestazione(prestazione, partecipanti, utenteId))
      .filter(Boolean),
  };
}

/** L'elenco delle mie catene: `{"chains": [...]}`; righe inutilizzabili scartate. */
export function normalizzaElencoCatene(risposta, utenteId) {
  const elenco = risposta?.chains;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map((riga) => normalizzaCatena(riga, utenteId)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Le nove funzioni del contratto
// ---------------------------------------------------------------------------

/**
 * POST /api/chains — avvia una ricerca con una coppia dei **miei** servizi.
 * La ricerca parte **subito** alla creazione (divergenza 2 del piano): la
 * risposta può essere già `AWAITING_CONFIRMATIONS`, o perfino `CANCELLED`.
 * Ripetere la stessa identica coppia torna la **stessa** catena (idempotente).
 */
export async function avviaRicercaCatena(token, utenteId, { offeredServiceId, requestedServiceId }) {
  const idOfferta = numeroInteroONull(offeredServiceId);
  const idRicerca = numeroInteroONull(requestedServiceId);
  if (idOfferta === null || idRicerca === null) {
    throw new ApiError(400, MESSAGGI_AVVIO[400]);
  }
  const risposta = await conMessaggiAvvio(
    apiFetch('chains', {
      method: 'POST',
      token,
      body: { offeredServiceId: idOfferta, requestedServiceId: idRicerca },
    }),
  );
  return normalizzaCatena(risposta?.chain, utenteId);
}

/** GET /api/chains — tutte le mie catene, con dettaglio completo: una chiamata sola. */
export async function ottieniCatene(token, utenteId) {
  return normalizzaElencoCatene(await apiFetch('chains', { token }), utenteId);
}

/** GET /api/chains/{id} — il dettaglio di una catena. */
export async function ottieniCatena(token, utenteId, id) {
  const idValido = numeroInteroONull(id);
  if (idValido === null) {
    return null;
  }
  const risposta = await apiFetch(`chains/${idValido}`, { token });
  return normalizzaCatena(risposta?.chain, utenteId);
}

/**
 * POST /api/chains/{id}/decision — la mia conferma del ciclo proposto.
 * `decisione` è nella forma interna (`DECISIONI_CATENA`); ripetere la stessa
 * decisione è idempotente per contratto.
 */
export async function decidiCatena(token, utenteId, id, decisione) {
  const idValido = numeroInteroONull(id);
  const decisioneContratto = decisioneAlContratto(decisione);
  if (idValido === null || decisioneContratto === null) {
    throw new ApiError(400, MESSAGGI_CONFERMA[400]);
  }
  const risposta = await conMessaggi(
    apiFetch(`chains/${idValido}/decision`, {
      method: 'POST',
      token,
      body: { decision: decisioneContratto },
    }),
    MESSAGGI_CONFERMA,
  );
  return normalizzaCatena(risposta?.chain, utenteId);
}

/**
 * POST /api/chains/{id}/agreements — proponi le condizioni di un arco.
 * `payload.startAt` deve essere già ISO 8601 con secondi e fuso: lo compone
 * `aOraLocaleIso` (`servizi/catene.js`), qui non si tocca. Ripetere le stesse
 * identiche condizioni torna lo stesso accordo; condizioni identiche a delle
 * **rifiutate** tornano quelle lì con `status: REJECTED` — la UI lo legge e
 * dice di cambiare luogo o orario.
 */
export async function proponiCondizioni(token, utenteId, id, payload) {
  const idValido = numeroInteroONull(id);
  const idBeneficiario = numeroInteroONull(payload?.recipientUserId);
  const luogo = testoONull(payload?.location);
  const inizio = testoONull(payload?.startAt);
  if (idValido === null || idBeneficiario === null || luogo === null || inizio === null) {
    throw new ApiError(400, MESSAGGI_CONDIZIONI[400]);
  }
  const risposta = await conMessaggi(
    apiFetch(`chains/${idValido}/agreements`, {
      method: 'POST',
      token,
      body: { recipientUserId: idBeneficiario, location: luogo, startAt: inizio },
    }),
    MESSAGGI_CONDIZIONI,
  );
  return normalizzaCondizioni(risposta?.agreement ?? null, [], utenteId);
}

/**
 * POST /api/chains/{id}/agreements/{agreementId}/decision — accetta o rifiuta
 * le condizioni. Solo il **beneficiario** può farlo (`403` altrimenti);
 * l'`ACCEPT` crea una prestazione, che si legge dalla rilettura della catena.
 */
export async function decidiCondizioni(token, utenteId, id, idCondizioni, decisione) {
  const idValido = numeroInteroONull(id);
  const idCondizioniValido = numeroInteroONull(idCondizioni);
  const decisioneContratto = decisioneAlContratto(decisione);
  if (idValido === null || idCondizioniValido === null || decisioneContratto === null) {
    throw new ApiError(400, MESSAGGI_DECISIONE_CONDIZIONI[400]);
  }
  const risposta = await conMessaggi(
    apiFetch(`chains/${idValido}/agreements/${idCondizioniValido}/decision`, {
      method: 'POST',
      token,
      body: { decision: decisioneContratto },
    }),
    MESSAGGI_DECISIONE_CONDIZIONI,
  );
  return normalizzaCondizioni(risposta?.agreement ?? null, [], utenteId);
}

/**
 * POST /api/chains/{id}/provisions/{provisionId}/receipt — conferma la ricezione
 * del servizio. Corpo **nessuno**. Ripetere è sicuro; l'ultima ricevuta porta la
 * catena a `COMPLETED`, quindi la risposta è la catena intera.
 */
export async function confermaRicezione(token, utenteId, id, idPrestazione) {
  const idValido = numeroInteroONull(id);
  const idPrestazioneValido = numeroInteroONull(idPrestazione);
  if (idValido === null || idPrestazioneValido === null) {
    throw new ApiError(400, MESSAGGI_RICEZIONE[404]);
  }
  const risposta = await conMessaggi(
    apiFetch(`chains/${idValido}/provisions/${idPrestazioneValido}/receipt`, {
      method: 'POST',
      token,
    }),
    MESSAGGI_RICEZIONE,
  );
  return normalizzaCatena(risposta?.chain, utenteId);
}

/**
 * POST /api/chains/{id}/cancel — annulla con motivo (1–255 caratteri).
 * L'autore è il **JWT**: qui non si manda nessun `cancelledByUserId`, e un
 * eventuale campo nel payload viene ignorato per contratto. Annullare una
 * catena `CONFIRMED` fa emettere al backend un buono per ogni altro
 * partecipante senza ricevuta.
 */
export async function annullaCatena(token, utenteId, id, motivo) {
  const idValido = numeroInteroONull(id);
  const motivoPulito = typeof motivo === 'string' ? motivo.trim() : '';
  if (idValido === null || motivoPulito.length === 0 || motivoPulito.length > 255) {
    throw new ApiError(400, MESSAGGI_ANNULLAMENTO[400]);
  }
  const risposta = await conMessaggi(
    apiFetch(`chains/${idValido}/cancel`, {
      method: 'POST',
      token,
      body: { reason: motivoPulito },
    }),
    MESSAGGI_ANNULLAMENTO,
  );
  return normalizzaCatena(risposta?.chain, utenteId);
}

/**
 * GET /api/tokens — i buoni di compensazione delle catene, in **sola lettura**
 * (vincolo 9 del piano): qui non c'è né spesa né contestazione. La funzione
 * vera (e il normalizzatore unico del buono) vivono in `aree/token.js`, che
 * del contratto dei buoni è l'area di casa; qui resta solo il nome storico che
 * «Scambi» legge, per non far toccare la schermata a chi sposta l'area.
 */
export async function ottieniBuoniCompensazione(token) {
  return ottieniBuoni(token);
}

/**
 * Le voci di una riga del feed Loop (`actorOfferService`/`actorRequestService`)
 * nel registro delle mie voci (vincolo 14, sorgente «best effort»): una riga
 * del feed dichiara **quattro** id, di cui i due attori sono i miei. Lo fa il
 * normalizzatore dell'elenco, che già ha le righe in mano.
 */
export function registraVociDaRigaFeed(utenteId, riga) {
  if (utenteId === null || utenteId === undefined) {
    return;
  }
  aggiungiMiaVoce(utenteId, riga?.actorOfferService, TIPI_VOCE.OFFERTA);
  aggiungiMiaVoce(utenteId, riga?.actorRequestService, TIPI_VOCE.RICERCA);
}

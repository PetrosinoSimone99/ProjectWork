import { ApiError, apiFetch } from './client';
import { USA_DATI_FINTI } from './config';
import {
  normalizzaAccordo,
  normalizzaCandidati,
  normalizzaCatalogo,
  normalizzaCategorie,
  normalizzaCoda,
  normalizzaElencoToken,
  normalizzaEsitoInvio,
  normalizzaEsitoScelta,
  normalizzaEsitoUtenteStaff,
  normalizzaNotifiche,
  normalizzaPubblicazioni,
  normalizzaRispostaAccesso,
  normalizzaSegnalazioneStaff,
  normalizzaSegnalazioniStaff,
  normalizzaServizio,
  normalizzaToken,
  normalizzaUtentiStaff,
  numeroInteroONull,
  queryDaFiltri,
} from './normalizzazioni';
import * as fintiAccesso from './finti/accesso';
import * as fintiCategorie from './finti/categorie';
import * as fintiChat from './finti/chat';
import * as fintiCoda from './finti/coda';
import * as fintiMatch from './finti/match';
import * as fintiNotifiche from './finti/notifiche';
import * as fintiSegnalazioni from './finti/segnalazioni';
import * as fintiServizi from './finti/servizi';
import * as fintiStaff from './finti/staff';
import * as fintiToken from './finti/token';
import * as fintiUtenti from './finti/utenti';
import { aPayloadLetta } from '@/servizi/notifiche';
import { aPayloadAggiornamento } from '@/servizi/offerta-ricerca';
import { aPayloadChiusura, aPayloadPresaInCarico } from '@/servizi/staff';
import { aPayloadRuolo, aPayloadStato } from '@/servizi/staff-utenti';
import { aPayloadImpegno } from '@/servizi/token';

// La superficie pubblica di prima resta quella: le funzioni spostate in
// `normalizzazioni.js` si riesportano da qui, così chi le importava non cambia.
export {
  normalizzaCandidati,
  normalizzaCatalogo,
  normalizzaCategorie,
  normalizzaCoda,
  normalizzaElencoToken,
  normalizzaGruppo,
  normalizzaPubblicazioni,
  normalizzaScadenza,
  normalizzaStatoGruppo,
  normalizzaStatoPubblicazione,
  normalizzaStoricoGruppi,
  normalizzaToken,
} from './normalizzazioni';

// Le funzioni nuove non ingrossano questo file (P53): si smistano per area in
// `aree/` e da qui si re-espongono solo i nomi, così per le schermate il layer
// resta un punto unico (§3 di `AGENTS.md`). Il prossimo smistamento lascerà
// qui una riga in meno e una export in più, non il contrario.
export { ottieniProfilo, aggiornaProfilo } from './aree/profilo';
export { creaPubblicazione } from './aree/servizi';

/**
 * Dati finti o backend vero.
 *
 * Il bivio sta **qui e solo qui** (`USA_DATI_FINTI` in `config.js`), visibile e
 * grep-abile: le schermate non sanno niente dei finti, tranne al massimo un
 * `Banner` che avvisa che i dati non sono reali. Ogni ramo finto porta il suo
 * `// TODO(backend)` con l'endpoint che si aspetta.
 */

// ---------------------------------------------------------------------------
// Accesso — login e registrazione
//
// Regola del titolare (27 settembre 2026): l'app **non dice mai** all'utente
// quale dato è «sbagliato» (username sbagliato? password sbagliata? già in
// uso?). I messaggi del backend, che sono espliciti e in inglese, si riassumono
// in testi generici prima di arrivare alla UI: il dettaglio resta nel log del
// server, non a schermo. I controlli di **forma** della schermata (campo vuoto,
// email malformata, categoria non scelta) restano espliciti: riguardano quello
// che l'utente sta scrivendo, non rivelano niente sugli altri utenti.
// ---------------------------------------------------------------------------

/** Messaggio generico per gli errori dell'accesso senza una mappatura precisa. */
const FALLBACK_ACCESSO = 'Qualcosa non ha funzionato. Riprova.';

/**
 * I messaggi generici dell'accesso, per endpoint e status. Qualunque testo
 * mandi il backend, la UI vede solo questi: niente «username o email già in
 * uso», niente «account inattivo» — decisione del titolare, vedi sopra.
 */
const MESSAGGI_ACCESSO_GENERICI = {
  login: {
    400: 'Credenziali non valide.',
    401: 'Credenziali non valide.',
    403: 'Credenziali non valide.',
  },
  register: {
    400: 'Controlla i dati inseriti: manca qualcosa o non è valido.',
    404: 'Controlla i dati inseriti: manca qualcosa o non è valido.',
    409: "Non è possibile creare l'account con questi dati.",
  },
};

/**
 * Rilancia l'errore dell'accesso con il messaggio generico della tabella.
 * Gli status non mappati (rete assente, timeout, 5xx) passano immutati: già
 * generici perché `client.js` li costruisce da sé.
 */
async function conMessaggioGenerico(chiamata, endpoint) {
  try {
    return await chiamata;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new ApiError(
        err.status,
        MESSAGGI_ACCESSO_GENERICI[endpoint]?.[err.status] ?? FALLBACK_ACCESSO,
      );
    }
    throw err;
  }
}

/**
 * POST /api/auth/login — restituisce il token Bearer per le chiamate autenticate.
 * `{token, user}` (`AuthController.php`) diventa `{token, utente}` con
 * `normalizzaRispostaAccesso`. Gli errori escono **solo generici** (vedi la
 * sezione sopra): il backend distingue 400/401/403, la UI dice «Credenziali
 * non valide.» per tutti.
 */
export async function login(username, password) {
  if (USA_DATI_FINTI) {
    // TODO(backend): il token finto serve solo alla demo.
    return conMessaggioGenerico(fintiAccesso.login(username, password), 'login');
  }
  return normalizzaRispostaAccesso(
    await conMessaggioGenerico(
      apiFetch('auth/login', {
        method: 'POST',
        body: { username, password },
      }),
      'login',
    ),
  );
}

/**
 * POST /api/auth/register — crea l'utente (con località, offerte e ricerche) e lo
 * autentica subito.
 *
 * Il form produce `{nome, cognome, username, email, password, localita, offerte,
 * ricerche}` ma il contratto vuole chiavi inglesi e un'altra forma per le voci:
 * il corpo si costruisce qui, non si manda `input` così com'è.
 *
 * Contratto (`AuthController::validateRegistration` + guida colleghi §3):
 * `location` non vuota, fino a 255 caratteri; `offers` e `requests` ognuna con
 * **almeno una voce**, descrizione 1–255 caratteri e **almeno una categoria** per
 * voce; la stessa categoria non può ripetersi nella stessa sezione (altrimenti
 * 400 — la validazione della schermata lo previene: vedi `register.jsx`).
 *
 * La casella «da remoto» della voce è **sospesa**: il contratto non modella il
 * campo (lo schema v2 non ha una colonna per lei) e il titolare ha deciso di
 * toglierla dalla UI finché il backend non lo aggiunge (decisione 27 settembre
 * 2026, vedi `temp/gruppo-2-domande/23`). Quando arriverà, il campo `da_remoto`
 * del payload diventerà un booleano `isRemote` nel corpo e le righe commentate
 * in `aCorpoVoci` e in `EditorVoceServizio` si riattiveranno.
 */
export async function register(input) {
  if (USA_DATI_FINTI) {
    // I finti restano sulla forma interna (`offerte`/`ricerche` con
    // `id_categoria`/`mansione`/`da_remoto`): la traduzione verso il contratto
    // vero sta solo qui, mai nei componenti.
    return conMessaggioGenerico(fintiAccesso.register(input), 'register');
  }
  const { nome, cognome, username, email, password, localita, offerte, ricerche } = input ?? {};
  return normalizzaRispostaAccesso(
    await conMessaggioGenerico(
      apiFetch('auth/register', {
        method: 'POST',
        body: {
          name: (nome ?? '').trim(),
          surname: (cognome ?? '').trim(),
          username,
          email,
          password,
          location: (localita ?? '').trim(),
          offers: aCorpoVoci(offerte),
          requests: aCorpoVoci(ricerche),
        },
      }),
      'register',
    ),
  );
}

/**
 * Le voci arrivano nella forma interna del modulo
 * (`aPayloadApi`: `{id_categoria, mansione, da_remoto}`) e diventano il corpo del
 * contratto: `{description, categoryIds}`.
 *
 * La «da remoto» è **sospesa** (decisione del titolare, 27 settembre 2026): il
 * contratto non modella il campo, quindi finché il backend non lo aggiunge
 * (`isRemote` su `services`, vedi `temp/gruppo-2-domande/23`) la casella non
 * compare nella UI e il valore arriva sempre `false`. Le righe che la
 * traducevano in testo («mansione (da remoto)») sono commentate qui sotto: si
 * decommentano insieme al blocco `AppCheckbox` di `EditorVoceServizio.jsx`, e
 * poi si cambia il testo con il booleano vero nel corpo.
 *
 * `id_categoria` qui è **sempre** un id scelto dalla tendina (la validazione
 * della schermata rifiuta l'invio senza categoria), quindi non serve un ramo
 * `categories` per nome: gli id sono il contratto con il backend.
 */
function aCorpoVoci(voci) {
  return (voci ?? []).map((voce) => ({
    description: String(voce.mansione ?? '').trim(),
    // SOSPESO «da remoto»: da riattivare quando il backend aggiunge `isRemote`
    // (vedi il commento della funzione). Il ramo sotto traduceva la casella in
    // testo nel `description`, perché il contratto non aveva il campo:
    // description: [
    //   String(voce.mansione ?? '').trim(),
    //   voce.da_remoto === true ? '(da remoto)' : null,
    // ].filter(Boolean).join(' '),
    categoryIds: voce.id_categoria === null || voce.id_categoria === undefined ? [] : [voce.id_categoria],
  }));
}

/**
 * GET /api/categories — le categorie, per le tendine di registrazione e di
 * pubblicazione.
 *
 * Contratto: `{categories: [{id, description}]}`
 * (`Backend/src/Controller/MarketplaceController.php`). La rotta è **pubblica
 * per le GET** (`Backend/config/packages/security.yaml`), quindi funziona anche
 * in registrazione, quando `token` è ancora null: le altre schermate passano il
 * token che hanno già e il backend lo ignora.
 */
export async function ottieniCategorie(token) {
  if (USA_DATI_FINTI) {
    return normalizzaCategorie(await fintiCategorie.ottieniCategorie());
  }
  return normalizzaCategorie(await apiFetch('categories', { token }));
}

/** POST Chat/cercaOCreaChat.php — trova o crea una chat 1:1. */
export async function cercaOCreaChat(token, utenteAttuale, membroChat) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST Chat/cercaOCreaChat.php; il finto copia la forma vera
    // (solo `{id_chat}`, niente busta) e il seme dei due messaggi.
    const dati = await fintiChat.cercaOCreaChat(utenteAttuale, membroChat);
    return Number(dati.id_chat);
  }
  const data = await apiFetch('Chat/cercaOCreaChat.php', {
    method: 'POST',
    body: { utenteAttuale, membroChat },
    token,
  });
  return Number(data.id_chat);
}

/** GET Chat/ottieniStoricoChat.php?chat=... — restituisce lo storico della chat. */
export function ottieniStoricoChat(token, chatId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET Chat/ottieniStoricoChat.php?chat=…, che risponde con
    // l'array nudo dei messaggi (nessuna busta).
    return fintiChat.ottieniStoricoChat(chatId);
  }
  return apiFetch(`Chat/ottieniStoricoChat.php?chat=${chatId}`, { token });
}

/** POST Chat/inviaMessaggio.php — invia un messaggio nella chat. */
export function inviaMessaggio(token, chatId, utenteId, messaggio) {
  if (USA_DATI_FINTI) {
    // TODO(backend): POST Chat/inviaMessaggio.php con {chat, utente, messaggio};
    // la risposta non contiene la riga creata, quindi la si rilegge dallo storico.
    return fintiChat.inviaMessaggio(chatId, utenteId, messaggio);
  }
  return apiFetch('Chat/inviaMessaggio.php', {
    method: 'POST',
    body: { chat: chatId, utente: utenteId, messaggio },
    token,
  });
}

// ---------------------------------------------------------------------------
// Offro e cerco — le proprie offerte e ricerche
//
// Il backend nuovo offre **solo la creazione** (`POST /api/services`, rotta di
// `MarketplaceController`): quella funzione vive in `aree/servizi.js` e qui
// sopra la si re-espone (P53). Il resto — elenco, modifica, stato,
// eliminazione — non ha endpoint: restano le funzioni fintate qui sotto,
// **inutilizzate** finché i colleghi non aggiungono il loro `servizi.php` (la
// schermata con i finti spenti non mostra l'elenco e non le può chiamare).
// ---------------------------------------------------------------------------

/**
 * GET servizi.php — le proprie offerte e ricerche, **sospese comprese**.
 * `utenteId` serve solo al ramo finto: il finto non decodifica il token
 * (su native `atob` non è garantito), come già fa `ottieniAccordi`.
 * TODO(backend): l'elenco delle proprie voci è la stessa cosa che manca a
 * modifica, stato ed eliminazione sotto: finché non c'è, con i finti spenti la
 * schermata non mostra l'elenco e nessuna di queste funzioni viene chiamata.
 */
export async function ottieniPubblicazioni(token, utenteId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET servizi.php → {success, message, data:{servizi:[…]}}.
    return normalizzaPubblicazioni(fintiServizi.ottieniServizi(utenteId));
  }
  return normalizzaPubblicazioni(await apiFetch('servizi.php', { token }));
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
// Endpoint: `GET /api/services` (rotta `api_services_list` di
// `MarketplaceController`): le offerte **attive degli altri** — il backend
// filtra già per tipo, stato account ed esclusione del viewer — con i filtri in
// query (`q`, `categoryIds`, `location`) e la paginazione nella risposta. Il
// parametro `sort` non si manda: il default del backend (`newest`) è quello che
// serve alla home. La normalizzazione della riga vive in `normalizzazioni.js`.
//
// La home **non conosce i dati finti**: il catalogo parla solo col backend vero
// (decisione del titolare, 30 settembre 2026). Con `EXPO_PUBLIC_DATI_FINTI=1`
// la chiamata finisce nella guardia di `client.js` e la home mostra il suo
// stato di errore, non un catalogo inventato.
// ---------------------------------------------------------------------------

/** Righe per pagina del catalogo: il default del backend, dichiarato anche qui. */
const LIMITE_PAGINA_CATALOGO = 20;

/**
 * GET /api/services — il catalogo della home, una pagina per volta.
 * `utenteId` serve a scartare le righe proprie, come fa `ottieniAccordi`.
 * Restituisce `{elenco, paginazione}`: chi chiama decide se può caricare altri.
 */
export async function ottieniCatalogo(token, utenteId, filtri, pagina = 1) {
  return normalizzaCatalogo(
    await apiFetch(`services${queryDaFiltri(filtri, pagina, LIMITE_PAGINA_CATALOGO)}`, { token }),
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
// stato del gruppo e i versi dichiarati (`offre_a`). Le normalizzazioni (stati,
// scadenze, membri) stanno in `normalizzazioni.js`: è anche il motivo per cui
// `useCoda` e `servizi/coda.js` non fanno parsing di date né di stati.
// ---------------------------------------------------------------------------

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

/**
 * GET segnalazioni.php?stato=… — le segnalazioni viste dalla **staff**, con
 * l'autore, il segnalato, il riferimento al fatto e lo stato. `stato` è
 * facoltativo: senza, il backend decide (presumibilmente tutte). `utenteId` serve
 * al ramo finto, che non decodifica il token di accesso.
 */
export async function ottieniSegnalazioniStaff(token, utenteId, stato) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET segnalazioni.php?stato=OPEN|IN_REVIEW|CLOSED con
    // l'identità dal token di accesso e `403` se chi chiama non è staff.
    return normalizzaSegnalazioniStaff(await fintiStaff.ottieniSegnalazioniStaff(utenteId, stato));
  }
  const query =
    typeof stato === 'string' && stato.trim() !== ''
      ? `?stato=${encodeURIComponent(stato.trim())}`
      : '';
  return normalizzaSegnalazioniStaff(await apiFetch(`segnalazioni.php${query}`, { token }));
}

/**
 * POST segnalazioni.php `{azione:'prendi_in_carico', id}` — porta la pratica da
 * `OPEN` a `IN_REVIEW`. Il `409` (già presa o chiusa) e il `403` (chi chiama non
 * è staff) si mostrano così come sono: la schermata ricarica e lascia parlare il
 * backend. L'identità viaggia **nel token**, mai nel corpo.
 */
export async function prendiInCaricoSegnalazione(token, utenteId, id) {
  const corpo = aPayloadPresaInCarico(id);
  if (USA_DATI_FINTI) {
    // TODO(backend): POST segnalazioni.php {azione:'prendi_in_carico', id}.
    const risposta = await fintiStaff.prendiInCarico(utenteId, id);
    return normalizzaSegnalazioneStaff(risposta?.data?.segnalazione);
  }
  const risposta = await apiFetch('segnalazioni.php', { method: 'POST', token, body: corpo });
  return normalizzaSegnalazioneStaff(risposta?.data?.segnalazione);
}

/**
 * POST segnalazioni.php `{azione:'chiudi', id, esiti, id_beneficiario?, nota}` —
 * chiude la pratica con uno o più esiti. `esiti` è una **lista** per permettere le
 * combinazioni decise il 18 settembre 2026; `id_beneficiario` c'è solo con
 * `TOKEN_ASSEGNATO`. La risposta porta la pratica chiusa e, quando il buono è
 * stato creato, il suo `id_token` (per il `Banner` che rimanda a «I miei token»).
 */
export async function chiudiSegnalazione(token, utenteId, id, esiti, nota, idBeneficiario = null) {
  const corpo = aPayloadChiusura(id, esiti, nota, idBeneficiario);
  if (USA_DATI_FINTI) {
    // TODO(backend): POST segnalazioni.php {azione:'chiudi', id, esiti,
    // id_beneficiario?, nota} con l'identità dal token.
    const risposta = await fintiStaff.chiudi(utenteId, id, esiti, nota, idBeneficiario);
    return {
      segnalazione: normalizzaSegnalazioneStaff(risposta?.data?.segnalazione),
      idToken: numeroInteroONull(risposta?.data?.id_token),
    };
  }
  const risposta = await apiFetch('segnalazioni.php', { method: 'POST', token, body: corpo });
  return {
    segnalazione: normalizzaSegnalazioneStaff(risposta?.data?.segnalazione),
    idToken: numeroInteroONull(risposta?.data?.id_token ?? risposta?.id_token),
  };
}

// ---------------------------------------------------------------------------
// Utenti dell'area staff — ruoli e stati
//
// Due dei tre endpoint **esistono già**: `userRoleManager.php` e
// `userStatoManager.php` funzionano e rispondono con la busta **piatta**
// `{messaggio, utente}` (la seconda busta del progetto, gestita da `client.js`).
// L'unico pezzo che manca è l'elenco (`utenti.php`, proposto): senza, i due
// manager non hanno interfaccia, ed è il motivo per cui `ottieniUtentiStaff` ha
// il suo `// TODO(backend)`. La ricerca e i filtri della schermata sono
// **locali** (lo dichiara la schermata): il contratto proposto li accetterebbe in
// query string, ma la demo non li usa perché l'elenco è piccolo.
// ---------------------------------------------------------------------------

/**
 * GET utenti.php — l'elenco degli utenti con ruolo e stato, per l'area staff.
 * Con i finti spenti risponde `404` (l'endpoint non esiste): la schermata lo
 * mostra come errore di caricamento, con «Riprova». `utenteId` serve solo al
 * ramo finto, che non decodifica il token di accesso.
 */
export async function ottieniUtentiStaff(token, utenteId) {
  if (USA_DATI_FINTI) {
    // TODO(backend): GET utenti.php?ruolo=&stato=&q= con l'identità dal token e
    // `403` se chi chiama non è STAFF/ADMIN; la risposta è
    // {success, message, data:{utenti:[{id, username, nome, cognome, ruolo, stato, creato_il}]}}.
    return normalizzaUtentiStaff(await fintiUtenti.ottieniUtentiStaff(utenteId));
  }
  return normalizzaUtentiStaff(await apiFetch('utenti.php', { token }));
}

/**
 * POST userRoleManager.php `{utente_id, ruolo}` — cambia il ruolo di un altro
 * utente. L'endpoint **esiste**: i `403` delle regole (e il `404` sul bersaglio
 * sparito) arrivano dal backend e si mostrano così come sono. L'identità
 * dell'operatore viaggia **nel token**, mai nel corpo. `utenteId` serve al ramo
 * finto.
 */
export async function cambiaRuoloUtente(token, utenteId, id, ruolo) {
  const corpo = aPayloadRuolo(id, ruolo);
  if (USA_DATI_FINTI) {
    // TODO(backend): niente, l'endpoint c'è; resta da aggiornare il finto quando
    // la busta vera cambierà.
    return normalizzaEsitoUtenteStaff(await fintiUtenti.cambiaRuolo(utenteId, id, ruolo));
  }
  const risposta = await apiFetch('userRoleManager.php', { method: 'POST', token, body: corpo });
  return normalizzaEsitoUtenteStaff(risposta);
}

/**
 * POST userStatoManager.php `{utente_id, stato}` — cambia lo stato di un altro
 * utente. Stessa forma della riga precedente; qui la regola in più è che il
 * bersaglio `ADMIN` è vietato anche a un altro `ADMIN` (asimmetria dichiarata tra
 * i due manager).
 */
export async function cambiaStatoUtente(token, utenteId, id, stato) {
  const corpo = aPayloadStato(id, stato);
  if (USA_DATI_FINTI) {
    // TODO(backend): niente, l'endpoint c'è; resta da aggiornare il finto quando
    // la busta vera cambierà.
    return normalizzaEsitoUtenteStaff(await fintiUtenti.cambiaStato(utenteId, id, stato));
  }
  const risposta = await apiFetch('userStatoManager.php', { method: 'POST', token, body: corpo });
  return normalizzaEsitoUtenteStaff(risposta);
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

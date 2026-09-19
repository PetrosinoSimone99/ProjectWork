/**
 * Finti: le **chat 1:1** della demo.
 *
 * Serve alla rotta `/chat`, che ha tre ingressi — «Apri la chat» dopo un match
 * (Loop), le due righe di «Le tue chat» (Scambi) e «Contatta» dal catalogo — e
 * senza questo deposito mostrerebbe la guardia dei finti («Questa sezione è in
 * arrivo.»). Gli endpoint veri **esistono** (`API/Chat/*`), quindi il finto non
 * inventa un contratto: ne copia la forma.
 *
 * Le tre forme di uscita sono quelle degli endpoint:
 * - `cercaOCreaChat` → `{id_chat}` (l'endpoint risponde con il solo id, niente busta);
 * - `ottieniStoricoChat` → **array nudo** di righe `{id, id_chat, id_utente,
 *   messaggio, data_creazione}` (l'endpoint fa `SELECT *` e stampa le righe);
 * - `inviaMessaggio` → `{successo, messaggio}`.
 *
 * Il deposito è un `Map` per **id di chat** con copia su `localStorage` (chiave
 * `barattolo.finti.chat`): sul web una conversazione sopravvive al reload, su
 * native degrada a sola memoria — degradazione dichiarata. La chat si cerca per
 * **coppia** di utenti (gli id ordinati, come fa l'endpoint con
 * `partecipanti_chat`), così l'ordine dei due parametri non conta.
 *
 * **Seme dichiarato**: una chat appena creata contiene due messaggi
 * dell'interlocutore, così lo storico non è vuoto e la schermata si vede come
 * sarà. Con `CHAT_VUOTA` si prova lo stato vuoto.
 *
 * Nessuna scrittura muta lo stato esistente: si legge, si copia, si sostituisce.
 * Il finto **non valida** i campi e **non risponde al posto dell'altro**: una
 * risposta automatica (o uno «sta scrivendo») sarebbe un comportamento che il
 * prodotto non ha — l'utente scrive e aspetta, e il messaggio arriva solo quando
 * l'altro scrive davvero dall'altra parte. Gli unici errori sono la coppia con lo
 * stesso utente (`400`) e la chat inesistente (`404`), come farebbe l'endpoint.
 *
 * TODO(backend): i tre endpoint che questo file sostituisce (`Chat/cercaOCreaChat.php`,
 * `Chat/ottieniStoricoChat.php`, `Chat/inviaMessaggio.php`) **esistono già**, con i difetti di
 * autorizzazione di P03/P04: qui si copia solo la loro forma, per rendere la demo percorribile.
 */

import { ApiError } from '../client';
import { adessoBackend } from './coda-dati';

const CHIAVE_PERSISTENZA = 'barattolo.finti.chat';

/** Attesa dichiarata: rende rappresentabili il caricamento e l'invio in corso. */
const ATTESA_CHAT_MS = 200;

/** Il messaggio dell'endpoint quando i due id coincidono. */
const MESSAGGIO_STESSO_UTENTE = 'Specifica due utenti diversi (id interi positivi).';

/** Il messaggio della chat che nel deposito non c'è. */
const MESSAGGIO_CHAT_ASSENTE = 'Questa chat non esiste.';

/**
 * Interruttore della prova: `true` fa nascere le chat **senza il seme**, così lo
 * stato vuoto («Nessun messaggio») si vede davvero. Non è una funzione del
 * prodotto: va riportato a `false` dopo la prova (le chat già seminate restano nel
 * deposito, quindi si riparte pulendo `barattolo.finti.chat`).
 */
export const CHAT_VUOTA = false;

/** Il seme: i due messaggi dell'interlocutore che una chat nuova si porta dietro. */
const SEME_MESSAGGI = [
  'Ciao, ci siamo sentiti per lo scambio?',
  'Per me va bene, quando ti torna?',
];

/** Il deposito: `chatId -> { id, idUtenteA, idUtenteB, messaggi: [] }`. */
const deposito = new Map();

let caricato = false;

/** Su native non c'è `localStorage`: il deposito resta solo in memoria. */
function localStorageDisponibile() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function leggiPersistito() {
  if (!localStorageDisponibile()) {
    return null;
  }
  try {
    const grezzo = window.localStorage.getItem(CHIAVE_PERSISTENZA);
    return grezzo ? JSON.parse(grezzo) : null;
  } catch (errore) {
    console.warn('Chat finte illeggibili: la demo riparte da zero.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  deposito.forEach((chat, idChat) => {
    serializzabile[idChat] = chat;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare le chat finte.', errore);
  }
}

function assicuraCaricato() {
  if (caricato) {
    return;
  }
  caricato = true;
  const salvato = leggiPersistito();
  if (!salvato || typeof salvato !== 'object') {
    return;
  }
  Object.entries(salvato).forEach(([idChat, chat]) => {
    deposito.set(Number(idChat), {
      id: Number(chat?.id ?? idChat),
      idUtenteA: Number(chat?.idUtenteA),
      idUtenteB: Number(chat?.idUtenteB),
      messaggi: Array.isArray(chat?.messaggi) ? chat.messaggi : [],
    });
  });
}

/** Copia della riga: chi la riceve non può modificare quella del deposito. */
function copia(riga) {
  return { ...riga };
}

/** L'id della chat continua dal più alto già presente, anche dopo un reload. */
function prossimoIdChat() {
  let massimo = 0;
  deposito.forEach((chat) => {
    massimo = Math.max(massimo, Number(chat.id) || 0);
  });
  return massimo + 1;
}

/** L'id del messaggio è progressivo **dentro la chat**: è l'ordine in cui si leggono. */
function prossimoIdMessaggio(messaggi) {
  return messaggi.reduce((massimo, riga) => Math.max(massimo, Number(riga.id) || 0), 0) + 1;
}

/**
 * La chat della **coppia**: i due id si ordinano, quindi cercare (A, B) o (B, A)
 * porta alla stessa conversazione. È la regola dell'endpoint (`partecipanti_chat`
 * con `COUNT(id_utente) = 2`), e una coppia ordinata è anche l'unico modo di
 * evitare due chat 1:1 per le stesse due persone.
 */
function chatDellaCoppia(idUno, idDue) {
  const minore = Math.min(idUno, idDue);
  const maggiore = Math.max(idUno, idDue);
  for (const chat of deposito.values()) {
    if (chat.idUtenteA === minore && chat.idUtenteB === maggiore) {
      return chat;
    }
  }
  return null;
}

/**
 * Una chat nuova con il suo seme. Il seme è di **membroChat**, cioè dell'altro:
 * entrando nella conversazione i due messaggi sono già lì e sono suoi, come se
 * l'altro avesse scritto per primo.
 */
function creaChat(utenteAttuale, membroChat, idChat) {
  const messaggi = CHAT_VUOTA
    ? []
    : SEME_MESSAGGI.map((testo, indice) => ({
        id: indice + 1,
        id_chat: idChat,
        id_utente: membroChat,
        messaggio: testo,
        data_creazione: adessoBackend(),
      }));

  return {
    id: idChat,
    idUtenteA: Math.min(utenteAttuale, membroChat),
    idUtenteB: Math.max(utenteAttuale, membroChat),
    messaggi,
  };
}

/**
 * TODO(backend): `POST Chat/cercaOCreaChat.php` con `{utenteAttuale, membroChat}`,
 * due interi positivi e diversi; la risposta è `{id_chat}` e basta. `400` se i due
 * id coincidono, come l'endpoint. `utenteAttuale` arriva dalla sessione, non dal
 * deposito: il finto non decodifica il token (su native `atob` non è garantito).
 */
export function cercaOCreaChat(utenteAttuale, membroChat) {
  assicuraCaricato();
  const attuale = Number(utenteAttuale);
  const membro = Number(membroChat);
  if (attuale === membro) {
    throw new ApiError(400, MESSAGGIO_STESSO_UTENTE);
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      const esistente = chatDellaCoppia(attuale, membro);
      const chat = esistente ?? creaChat(attuale, membro, prossimoIdChat());
      if (!esistente) {
        deposito.set(chat.id, chat);
        scriviPersistito();
      }
      resolve({ id_chat: chat.id });
    }, ATTESA_CHAT_MS);
  });
}

/**
 * TODO(backend): `GET Chat/ottieniStoricoChat.php?chat=…`, che risponde con
 * l'**array nudo** delle righe (nessuna busta) e con `[]` per una chat senza
 * messaggi. L'endpoint vero non rifiuta una chat inesistente (restituirebbe `[]`);
 * il finto risponde `404`, così la schermata si esercita anche sul percorso
 * d'errore.
 */
export function ottieniStoricoChat(chatId) {
  assicuraCaricato();
  const chat = deposito.get(Number(chatId)) ?? null;
  if (!chat) {
    throw new ApiError(404, MESSAGGIO_CHAT_ASSENTE);
  }

  const messaggi = [...chat.messaggi]
    .sort((uno, due) => Number(uno.id) - Number(due.id))
    .map(copia);
  return new Promise((resolve) => {
    setTimeout(() => resolve(messaggi), ATTESA_CHAT_MS);
  });
}

/**
 * TODO(backend): `POST Chat/inviaMessaggio.php` con `{chat, utente, messaggio}`;
 * la risposta è `{successo, messaggio}` e **non** contiene la riga creata, quindi
 * il layer non può aggiungerla alla lista: la schermata ricarica lo storico
 * (`useChat` lo fa già). `404` se la chat non c'è, `400` se il testo è vuoto —
 * il finto non valida (il testo arriva già ripulito dalla schermata).
 */
export function inviaMessaggio(chatId, utenteId, testo) {
  assicuraCaricato();
  const id = Number(chatId);
  const chat = deposito.get(id) ?? null;
  if (!chat) {
    throw new ApiError(404, MESSAGGIO_CHAT_ASSENTE);
  }

  const riga = {
    id: prossimoIdMessaggio(chat.messaggi),
    id_chat: id,
    id_utente: Number(utenteId),
    messaggio: testo,
    data_creazione: adessoBackend(),
  };
  deposito.set(id, { ...chat, messaggi: [...chat.messaggi, riga] });
  scriviPersistito();

  return new Promise((resolve) => {
    setTimeout(() => resolve({ successo: true, messaggio: 'Messaggio inviato.' }), ATTESA_CHAT_MS);
  });
}

/** Svuota il deposito: comodo per riprovare la demo da zero (e il seme). */
export function azzeraFinti() {
  deposito.clear();
  caricato = true;
  scriviPersistito();
}

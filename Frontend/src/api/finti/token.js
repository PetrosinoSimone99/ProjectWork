/**
 * Finti: i **buoni** («token») dell'utente.
 *
 * Serve perché i buoni non esistono in nessun endpoint: senza questo deposito la
 * schermata «I miei token» non avrebbe niente da mostrare e il ciclo
 * impegno → uso non si potrebbe provare. Il deposito è un `Map` per utente con
 * copia su `localStorage` (chiave `barattolo.finti.token`): sul web un buono
 * impegnato sopravvive al reload, su native degrada a sola memoria —
 * degradazione dichiarata, come per gli altri finti.
 *
 * Restituisce la **forma di rete** dell'endpoint proposto (`token.php`): la
 * normalizzazione è una sola e sta in `api/barattolo.js`. I finti **non
 * validano**: un impegno su un buono già usato non risponde `409`, perché un
 * finto che rifiuta darebbe l'illusione di un contratto che non esiste (il `409`
 * vero arriverà dal backend). L'unico rifiuto è il `404` su un id che nel
 * deposito non c'è: è un errore di programmazione, non una regola di prodotto.
 *
 * Due cose dichiaratamente finte, che il backend deciderà:
 * - **la scadenza**: «un mese esatto da quando è stato ottenuto» è la decisione
 *   del titolare del 18 settembre 2026, ma è il backend a scriverla nel dato;
 * - **l'id dell'accordo** che l'impegno apre: qui è sintetico, perché il finto
 *   non ha un accordo vero da collegare.
 *
 * `consumaToken` e `liberaToken` **non sono chiamate dall'utente**: le chiama il
 * sistema (l'accordo passa a `COMPLETATO`, oppure si annulla o si contesta). Sono
 * qui perché è il deposito che cambia stato, e perché la sceneggiatura della
 * demo deve poter mostrare il passaggio; nel backend saranno dentro la stessa
 * transazione del cambio di stato dell'accordo.
 */

import { ApiError } from '../client';

const CHIAVE_PERSISTENZA = 'barattolo.finti.token';

/** Attesa dichiarata: rende rappresentabile lo stato di caricamento dell'elenco. */
const ATTESA_MS = 300;

/** Un giorno e un mese, per il seme e per la scadenza. */
const GIORNO_MS = 86_400_000;

/**
 * Interruttore della prova: `true` fa ripartire il deposito **vuoto**, per vedere
 * lo stato «Non hai token». Non è una funzione del prodotto e va riportato a
 * `false` dopo la prova (si ricarica la pagina: il seme non viene mai salvato).
 */
export const SEME_VUOTO = false;

/** Il deposito: `utenteId -> [riga di rete]`. */
const deposito = new Map();

let caricato = false;

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
    console.warn('Buoni finti illeggibili: la demo riparte dal seme.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  deposito.forEach((buoni, utenteId) => {
    serializzabile[utenteId] = buoni;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare i buoni finti.', errore);
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
  Object.entries(salvato).forEach(([utenteId, buoni]) => {
    if (Array.isArray(buoni)) {
      deposito.set(Number(utenteId), buoni);
    }
  });
}

/** Una data nella forma del backend: `2026-10-18 10:12:00`. */
function formattaBackend(ms) {
  const data = new Date(ms);
  const due = (valore) => String(valore).padStart(2, '0');
  return (
    `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())} ` +
    `${due(data.getHours())}:${due(data.getMinutes())}:${due(data.getSeconds())}`
  );
}

/**
 * Un mese dopo, con il giorno accorciato se il mese non lo ha (31 gennaio →
 * 28/29 febbraio). È l'approssimazione dichiarata di «un mese esatto»: la regola
 * vera la scrive il backend.
 */
function aggiungiUnMese(ms) {
  const data = new Date(ms);
  const giorno = data.getDate();
  data.setDate(1);
  data.setMonth(data.getMonth() + 1);
  const ultimoGiorno = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
  data.setDate(Math.min(giorno, ultimoGiorno));
  return data.getTime();
}

/**
 * TODO(backend): il seme è la sceneggiatura della demo, non dati reali. Un buono
 * per ognuno dei quattro stati, con i servizi presi dal catalogo finto (l'id 3 e
 * l'id 7 esistono in `finti/catalogo.js`), così la schermata mostra tutte le
 * sezioni appena si apre.
 */
function seme(utenteId) {
  if (SEME_VUOTO) {
    return [];
  }
  const adesso = Date.now();
  const creato = (giorniFa) => adesso - giorniFa * GIORNO_MS;
  /** Un buono con la scadenza calcolata da quando è stato ottenuto. */
  const buono = (id, stato, origine, giorniFa, extra = {}) => {
    const emessoIl = creato(giorniFa);
    return {
      id,
      stato,
      origine,
      creato_il: formattaBackend(emessoIl),
      scadenza: formattaBackend(aggiungiUnMese(emessoIl)),
      usato_il: null,
      id_servizio_usato: null,
      id_accordo: null,
      ...extra,
    };
  };
  return [
    buono(1, 'AVAILABLE', 'Servizio non svolto', 5),
    buono(2, 'RESERVED', 'Catena interrotta', 10, {
      id_servizio_usato: 3,
      id_accordo: 512,
    }),
    buono(3, 'SPENT', 'Servizio non erogato', 20, {
      usato_il: formattaBackend(creato(3)),
      id_servizio_usato: 7,
      id_accordo: 480,
    }),
    buono(4, 'EXPIRED', 'Accordo annullato', 70),
  ];
}

/** Le righe dell'utente: il salvato se c'è, altrimenti il seme (che non viene persistito). */
function buoniDepositati(utenteId) {
  assicuraCaricato();
  const salvato = deposito.get(Number(utenteId));
  if (Array.isArray(salvato)) {
    return salvato;
  }
  return seme(utenteId);
}

function scriviBuoni(utenteId, buoni) {
  deposito.set(Number(utenteId), buoni);
  scriviPersistito();
}

/** Copia della riga: chi riceve il buono non può modificare quello del deposito. */
function copia(buono) {
  return { ...buono };
}

function busta(message, data) {
  return { success: true, message, data };
}

/** L'indice del buono con quell'id, o un `404` come farebbe l'endpoint vero. */
function indiceDi(buoni, idToken) {
  const indice = buoni.findIndex((buono) => Number(buono.id) === Number(idToken));
  if (indice === -1) {
    throw new ApiError(404, 'Questo buono non esiste più.');
  }
  return indice;
}

/** Sostituisce il buono all'indice, senza mutare l'array originale. */
function sostituisci(buoni, indice, aggiornato) {
  return buoni.map((buono, posizione) => (posizione === indice ? aggiornato : buono));
}

/**
 * TODO(backend): `GET token.php` → `{success, message, data:{token:[…]}}` con i
 * **propri** buoni (l'identità dal token di accesso). `utenteId` serve perché il
 * finto non decodifica il token (su native `atob` non è garantito).
 */
export function ottieniToken(utenteId) {
  const token = buoniDepositati(utenteId).map(copia);
  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Token caricati.', { token })), ATTESA_MS);
  });
}

/**
 * TODO(backend): `POST token.php {azione:'impegna', id_token, id_servizio}` con
 * l'identità **dal token di accesso** e `409` se il buono è già impegnato, usato
 * o scaduto. Il finto non valida lo stato: segna e basta. L'`id_accordo` è
 * sintetico — è l'accordo che l'impegno apre nel sistema vero.
 */
export function impegnaToken(utenteId, idToken, idServizio) {
  const buoni = buoniDepositati(utenteId);
  const indice = indiceDi(buoni, idToken);
  const aggiornato = {
    ...buoni[indice],
    stato: 'RESERVED',
    id_servizio_usato: idServizio ?? null,
    id_accordo: 9000 + Number(idToken),
  };
  scriviBuoni(utenteId, sostituisci(buoni, indice, aggiornato));

  return new Promise((resolve) => {
    setTimeout(
      () => resolve(busta('Token impegnato per questo scambio.', { token: copia(aggiornato) })),
      ATTESA_MS,
    );
  });
}

/**
 * L'**assegnazione** da parte della staff: non è un'azione dell'utente e nessuna
 * schermata la chiama. La usa il **piano 11** (la staff chiude una segnalazione
 * con esito `TOKEN_ASSEGNATO`) tramite `finti/notifiche.js`, che scrive anche la
 * notifica per l'utente. L'id continua da quello più alto già presente e il buono
 * nasce `AVAILABLE`, con il mese di validità calcolato come gli altri.
 */
export function assegnaToken(utenteId, origine) {
  const buoni = buoniDepositati(utenteId);
  const id = buoni.reduce((massimo, buono) => Math.max(massimo, Number(buono.id) || 0), 0) + 1;
  const emessoIl = Date.now();
  const testo = typeof origine === 'string' ? origine.trim() : '';
  const riga = {
    id,
    stato: 'AVAILABLE',
    origine: testo || 'Assegnato dalla staff',
    creato_il: formattaBackend(emessoIl),
    scadenza: formattaBackend(aggiungiUnMese(emessoIl)),
    usato_il: null,
    id_servizio_usato: null,
    id_accordo: null,
  };
  scriviBuoni(utenteId, [...buoni, riga]);
  return riga;
}

/**
 * Il consumo è del **sistema**, alla conclusione dell'accordo: non è un'azione
 * dell'utente e la schermata non la chiama. Restituisce la forma di rete, come
 * se il backend l'avesse appena fatta.
 */
export function consumaToken(utenteId, idToken) {
  const buoni = buoniDepositati(utenteId);
  const indice = indiceDi(buoni, idToken);
  const aggiornato = {
    ...buoni[indice],
    stato: 'SPENT',
    usato_il: formattaBackend(Date.now()),
  };
  scriviBuoni(utenteId, sostituisci(buoni, indice, aggiornato));
  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Token consumato.', { token: copia(aggiornato) })), ATTESA_MS);
  });
}

/**
 * Il rilascio è del **sistema**, quando l'accordo si annulla o si contesta: il
 * buono torna disponibile e si può riusare.
 */
export function liberaToken(utenteId, idToken) {
  const buoni = buoniDepositati(utenteId);
  const indice = indiceDi(buoni, idToken);
  const aggiornato = {
    ...buoni[indice],
    stato: 'AVAILABLE',
    id_servizio_usato: null,
    id_accordo: null,
  };
  scriviBuoni(utenteId, sostituisci(buoni, indice, aggiornato));
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(busta('Token tornato disponibile.', { token: copia(aggiornato) })),
      ATTESA_MS,
    );
  });
}

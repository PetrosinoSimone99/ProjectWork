/**
 * Finti: i candidati di «Loop» (lo swipe), i like ricevuti e la memoria delle
 * scelte.
 *
 * Perché un file nuovo e non un allargamento di quelli che ci sono: `catalogo.js`
 * è «i servizi di tutti» (la home), `servizi.js` è «il deposito delle proprie
 * voci», e questo è una terza cosa — **la compatibilità fra i due, i like
 * ricevuti e le scelte fatte**. Lo stesso ragionamento con cui il catalogo è
 * nato separato dal deposito.
 *
 * Il finto **non inventa un mondo nuovo**: riusa i 12 servizi segnaposto di
 * `catalogo.js` (stesse persone, stesse categorie, stesse mansioni) come `offre`,
 * così la persona che si vede in Home è la stessa che si vede qui. Non tocca
 * `servizi.js` né `accesso.js`: li legge soltanto.
 *
 * Restituisce la **forma di rete**, non quella della scheda: la normalizzazione
 * è una sola e sta in `api/barattolo.js`, come per ogni altro finto.
 *
 * Sul **web** le scelte si appoggiano a `localStorage` (chiave
 * `barattolo.finti.scelte`), perché la sessione finta sta lì e una scheda
 * passata non deve tornare dopo un reload; su **native**, dove `window` non
 * esiste, degradano a sola memoria — degradazione dichiarata, non silenziosa.
 *
 * I finti **non validano**: accettano e basta. Una scelta ripetuta sovrascrive
 * la precedente invece di rispondere 409, perché un finto che rifiuta darebbe
 * l'illusione di un contratto che non esiste.
 */

import { elencoServiziFinti } from './catalogo';
import { ottieniVoci } from './servizi';

const CHIAVE_PERSISTENZA = 'barattolo.finti.scelte';

/**
 * Attese dichiarate e volute.
 * - La prima rende rappresentabile lo stato «sto cercando le persone» e
 *   l'attesa di una scelta in volo (senza, i pulsanti non avrebbero mai lo
 *   spinner e la guardia sul doppio invio non sarebbe osservabile).
 * - Non sono una simulazione della rete: sono il tempo necessario a rendere
 *   visibili due stati che esistono.
 */
const ATTESA_CANDIDATI_MS = 300;
const ATTESA_SCELTA_MS = 250;

/**
 * Le **ricerche** delle persone del catalogo: `offerente.id -> ricerca`.
 *
 * Le offre sono già nei 12 servizi; le ricerche no, perché il catalogo non le
 * mostra. Ognuna ha un id (1000 + id della persona) per avere la stessa forma di
 * una voce.
 *
 * TODO(backend): la ricerca di ogni persona arriva da `Match/candidati.php`
 * (campo `cerca`), non da una tabella scritta a mano nel frontend.
 *
 * **Invariante della demo, da non rompere**: per ognuna delle 10 categorie di
 * `finti/categorie.js` esiste almeno una persona che la **cerca** e almeno una
 * che la **offre** (le seconde sono le 12 offerte, che coprono tutte e dieci le
 * categorie; le prime sono queste righe). Senza, chi si registra scegliendo una
 * categoria sfortunata vedrebbe una pila vuota e la schermata sembrerebbe rotta
 * alla prima prova.
 */
const RICERCHE_FINTE = {
  101: { id: 1101, id_categoria: 3, mansione: 'Riparazione del portatile di casa', da_remoto: true },
  102: { id: 1102, id_categoria: 10, mansione: 'Qualcuno che tenga il gatto nel weekend', da_remoto: false },
  103: { id: 1103, id_categoria: 5, mansione: 'Pulizie di fine trasloco', da_remoto: false },
  104: { id: 1104, id_categoria: 2, mansione: 'Montaggio di due armadi', da_remoto: false },
  105: { id: 1105, id_categoria: 7, mansione: 'Foto per il curriculum', da_remoto: false },
  106: { id: 1106, id_categoria: 9, mansione: 'Tinteggiatura di una stanza', da_remoto: false },
  107: { id: 1107, id_categoria: 4, mansione: 'Potatura di due siepi', da_remoto: false },
  108: { id: 1108, id_categoria: 1, mansione: 'Ripetizioni di statistica', da_remoto: true },
  109: { id: 1109, id_categoria: 6, mansione: 'Aiuto con un foglio di calcolo', da_remoto: true },
  110: { id: 1110, id_categoria: 8, mansione: 'Traduzione di un contratto', da_remoto: true },
  111: { id: 1111, id_categoria: 6, mansione: 'Sistemare le formule di un preventivo', da_remoto: true },
  112: { id: 1112, id_categoria: 10, mansione: 'Pet sitting per un cane anziano', da_remoto: false },
};

/**
 * Chi **mi ha già messo like**, cioè chi entra nella mia pila con la riga «Ti ha
 * messo like» e i pulsanti «Accetta»/«Rifiuta». Due persone, scelte per mostrare
 * i due casi utili alla prima prova:
 *
 * - **108 (Davide)** cerca «Ripetizioni», quindi per chi si registra offrendo
 *   Ripetizioni la scheda mostra **il like e il motivo** insieme;
 * - **112 (Federico)** non è compatibile con quella stessa registrazione, quindi
 *   mostra **solo** il like — che nel modello reale è possibile: chi ti mette
 *   like non deve per forza essere compatibile con te.
 *
 * TODO(backend): la scelta ricevuta arriva dentro ogni candidato
 * (`scelta_ricevuta` / `ti_ha_scelto`) e chi ti ha messo like deve **entrare
 * nella pila** (nella query), altrimenti resta solo un avviso senza un posto
 * dove agire.
 */
const LIKE_RICEVUTI = [108, 112];

/** `utenteId -> { [chiaveScelta]: 'INTERESSE' | 'PASSA' }`. */
const depositoScelte = new Map();

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
    console.warn('Scelte finte illeggibili: la demo riparte da zero.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  depositoScelte.forEach((scelte, utenteId) => {
    serializzabile[utenteId] = scelte;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare le scelte finte.', errore);
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
  Object.entries(salvato).forEach(([utenteId, scelte]) => {
    depositoScelte.set(Number(utenteId), scelte && typeof scelte === 'object' ? scelte : {});
  });
}

function scelteDepositate(utenteId) {
  assicuraCaricato();
  return depositoScelte.get(Number(utenteId)) ?? {};
}

/**
 * La chiave di una scelta: la persona **e** l'offerta mostrata. È la stessa
 * informazione che la scelta deve mandare al backend (`utente_id` + `id_offerta`),
 * quindi le due cose non possono divergere.
 */
function chiaveScelta(candidatoId, idOfferta) {
  return `${candidatoId}-${idOfferta}`;
}

/**
 * Il motivo della compatibilità, calcolato come lo calcolerebbe il backend:
 * si confrontano le **categorie** (non i testi) fra le mie voci e le sue.
 *
 * TODO(backend): il motivo lo calcola il backend. Questa è la regola dichiarata
 * del finto, non un'assunzione su come lo farà lui.
 */
function calcolaMotivo(mieVoci, offerta, ricerca) {
  const categorieOfferte = new Set(mieVoci.offerte.map((voce) => Number(voce.id_categoria)));
  const categorieCercate = new Set(mieVoci.ricerche.map((voce) => Number(voce.id_categoria)));

  const cercaQuelloCheOffro = ricerca
    ? categorieOfferte.has(Number(ricerca.id_categoria))
    : false;
  const offreQuelloCheCerco = categorieCercate.has(Number(offerta.id_categoria));

  if (cercaQuelloCheOffro && offreQuelloCheCerco) {
    return 'ENTRAMBI';
  }
  if (cercaQuelloCheOffro) {
    return 'CERCA_QUELLO_CHE_OFFRO';
  }
  if (offreQuelloCheCerco) {
    return 'OFFRE_QUELLO_CHE_CERCO';
  }
  return null;
}

/** La ricerca di una persona nella forma della voce, o `null` se non ne ha. */
function ricercaDi(offerenteId) {
  const riga = RICERCHE_FINTE[offerenteId];
  if (!riga) {
    return null;
  }
  return { ...riga, tipo: 'RICERCA', localita: '', stato: 'PUBBLICATA' };
}

/**
 * Un candidato nella forma di rete, oppure `null` se non ha niente da dire:
 * senza un motivo e senza un like ricevuto non entra nella pila.
 */
function candidatoDaServizio(servizio, mieVoci) {
  const offerente = servizio.offerente;
  const offerta = {
    id: servizio.id,
    tipo: 'OFFERTA',
    id_categoria: servizio.id_categoria,
    mansione: servizio.mansione,
    da_remoto: servizio.da_remoto,
    localita: servizio.localita,
    stato: servizio.stato,
  };
  const cerca = ricercaDi(offerente.id);
  const motivo = calcolaMotivo(mieVoci, offerta, cerca);
  const tiHaScelto = LIKE_RICEVUTI.includes(Number(offerente.id));

  if (motivo === null && !tiHaScelto) {
    return null;
  }

  return {
    offerente: { ...offerente },
    offre: offerta,
    cerca,
    motivo,
    ti_ha_scelto: tiHaScelto,
  };
}

function busta(message, data) {
  return { success: true, message, data };
}

/**
 * TODO(backend): `GET Match/candidati.php` → `{success, message,
 * data:{candidati:[…]}}`, con i candidati **non ancora scelti** (il filtro delle
 * scelte è del backend: il frontend non manda una lista di esclusi e non filtra
 * per conto suo) e con `scelta_ricevuta` per chi ti ha già messo like.
 *
 * `utenteId` serve perché il finto non decodifica il token (su native `atob` non
 * è garantito), come già fanno `ottieniAccordi` e `ottieniCatalogo`.
 */
export function ottieniCandidati(utenteId) {
  const scelte = scelteDepositate(utenteId);
  const mieVoci = ottieniVoci(utenteId);

  const candidati = elencoServiziFinti()
    .map((servizio) => candidatoDaServizio(servizio, mieVoci))
    .filter(Boolean)
    .filter((candidato) => !scelte[chiaveScelta(candidato.offerente.id, candidato.offre.id)]);

  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Candidati caricati.', { candidati })), ATTESA_CANDIDATI_MS);
  });
}

/**
 * TODO(backend): `POST Match/candidati.php` con
 * `{azione:'scelta', utente_id, id_offerta, scelta:'INTERESSE'|'PASSA'}` (o
 * `Match/scelte.php`). La risposta deve dire **se l'interesse è ricambiato**
 * (`data.match`): il frontend non lo deduce da sé.
 *
 * `match: true` **solo** su un `INTERESSE` verso chi aveva già scelto me: è la
 * stessa regola con cui lo calcolerebbe il backend, e serve a provare la
 * schermata «È un match!» senza backend.
 */
export function registraScelta(utenteId, candidatoId, idOfferta, scelta) {
  const attuali = scelteDepositate(utenteId);
  // I finti non validano: una scelta ripetuta sovrascrive la precedente.
  depositoScelte.set(Number(utenteId), {
    ...attuali,
    [chiaveScelta(candidatoId, idOfferta)]: scelta,
  });
  scriviPersistito();

  const match = scelta === 'INTERESSE' && LIKE_RICEVUTI.includes(Number(candidatoId));
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(busta('Scelta registrata.', { scelta, match })),
      ATTESA_SCELTA_MS,
    );
  });
}

/** Copia delle scelte di un utente: serve alle prove e, domani, alla coda. */
export function ottieniScelte(utenteId) {
  return { ...scelteDepositate(utenteId) };
}

/** Svuota il deposito delle scelte: comodo per riprovare la demo da zero. */
export function azzeraScelteFinti() {
  depositoScelte.clear();
  caricato = true;
  scriviPersistito();
}

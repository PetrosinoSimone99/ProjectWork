/**
 * Offerta e ricerca: la forma del dato e le sue regole, in un punto solo.
 *
 * È l'analogo, per le voci pubblicate, di `src/services/agreements.js` per gli
 * accordi: logica di dominio fuori dalle schermate. Le schermate che trattano le
 * voci (registrazione, pubblicazione, filtri, match) importano questo modulo e
 * non ridichiarano niente: se il backend cambia un nome di campo, si cambia qui.
 *
 * Nessuna funzione muta i dati ricevuti: copia, trasforma, restituisce.
 */

import { formattaLocalita, formattaProvinciaPerFiltro } from '@/services/italian-locations';

/** I due tipi di voce. Stringhe, perché viaggiano in JSON e finiscono nelle query. */
export const TIPI_VOCE = { OFFERTA: 'OFFERTA', RICERCA: 'RICERCA' };

/**
 * Limite del testo della mansione.
 * TODO(backend): confermare — la proposta ai colleghi (Parte 19) usa
 * `mansione VARCHAR(150)`, mentre `descrizione_servizio` è `VARCHAR(100)`.
 */
export const LIMITE_MANSIONE = 150;

/**
 * Un'offerta e una ricerca per persona (regola di prodotto, 2026-11-11):
 * prima erano cinque per tipo. È l'unica manopola della regola e vale per
 * entrambi i tipi, che tengono liste e tetti separati.
 *
 * Oggi il tetto vive **solo qui**, come ci viveva il cinque: `Backend/` non
 * dichiara nessun limite di voci (verificato con `grep`), quindi non c'è un
 * secondo posto da tenere allineato e nessun controllo lato server da
 * aggiungere. Se un giorno il backend lo impone, questa costante diventa la
 * copia da leggere dal contratto, non un valore da indovinare.
 */
export const LIMITE_VOCI = 1;

/**
 * Come si chiama una voce del tipo indicato, al singolare e al plurale.
 * Con un tetto di 1 la differenza non è un dettaglio di stile: «1 offerte»
 * è sbagliato, e la frase del limite non può più stampare la costante nuda.
 */
export const SOSTANTIVI_VOCE = {
  [TIPI_VOCE.OFFERTA]: { singolare: 'offerta', plurale: 'offerte' },
  [TIPI_VOCE.RICERCA]: { singolare: 'ricerca', plurale: 'ricerche' },
};

/**
 * Il sostantivo che regge il numero davanti: «1 offerta», «3 offerte».
 * Un tipo che il dizionario non conosce cade sul generico «voce»: non sarà la
 * parola più precisa, ma è un sostantivo — meglio di una frase che chiama
 * «offerta» qualcosa che non lo è.
 */
function sostantivoVoce(tipo, quanti) {
  const nomi = SOSTANTIVI_VOCE[tipo] ?? { singolare: 'voce', plurale: 'voci' };
  return quanti === 1 ? nomi.singolare : nomi.plurale;
}

/**
 * Limite della località dell'annuncio: `services.location` è `varchar(255)`
 * (`Context_and_DB_V2/barattolo_15112026.sql`). Il valore più lungo che il
 * dataset sa comporre è 65 caratteri, quindi il limite è oggi irraggiungibile:
 * resta come rete di sicurezza se il dataset cambiasse.
 */
export const LIMITE_LOCALITA = 100;

/**
 * Gli stati di pubblicazione di una voce.
 * TODO(backend): i valori veri non sono decisi — `barattolo.js` li normalizza,
 * quindi il giorno in cui i colleghi scelgono altri nomi cambia una funzione sola.
 */
export const STATI_PUBBLICAZIONE = { PUBBLICATA: 'PUBBLICATA', SOSPESA: 'SOSPESA' };

/** Etichette italiane degli stati di pubblicazione. */
export const ETICHETTE_STATO_PUBBLICAZIONE = {
  [STATI_PUBBLICAZIONE.PUBBLICATA]: 'Pubblicata',
  [STATI_PUBBLICAZIONE.SOSPESA]: 'Sospesa',
};

/**
 * @typedef {Object} VoceServizio
 * @property {string} chiave        id locale stabile (liste, chiavi React, errori per riga)
 * @property {'OFFERTA'|'RICERCA'} tipo
 * @property {number|null} idCategoria  null finché non scelta; è l'unica cosa che fa match
 * @property {string} mansione      testo libero
 * @property {boolean} daRemoto     false = in presenza (la casella ha sempre un valore)
 * @property {string} provincia      provincia scelta nel form (nome del dataset), '' = non scelta
 * @property {string} comune        comune scelto nel form (nome del dataset), '' = non scelto
 * @property {string} localita      valore che viaggia: `Comune - Provincia` derivato da comune/provincia; '' in registrazione
 * @property {string|null} stato    stato di pubblicazione: null finché arriva dall'elenco
 * @property {number|null} id       id del server: null in registrazione e nel form
 */

let contatoreChiavi = 0;

/** Chiave locale progressiva: niente `Math.random`, così l'ordine resta riproducibile. */
function nuovaChiave(tipo) {
  contatoreChiavi += 1;
  return `${tipo}-${contatoreChiavi}`;
}

/** Una voce vuota del tipo indicato, con l'id del server ancora assente. */
export function nuovaVoce(tipo) {
  return {
    chiave: nuovaChiave(tipo),
    tipo,
    idCategoria: null,
    mansione: '',
    daRemoto: false,
    provincia: '',
    comune: '',
    localita: '',
    stato: null,
    id: null,
  };
}

/**
 * La località di una voce nella forma che viaggia: `Comune - Provincia`, oppure
 * '' se manca una delle due metà (metà sola non è un valore di località, formato
 * imposto dal piano). Helper unico: form, validazione e payload usano questa.
 *
 * Nota di design: un valore `localita` legacy non conforme (testo libero o
 * `Provincia (Regione)` scritto prima del piano) si perde alla prima modifica
 * della voce. Accettato e deciso il 2026-10-13: il database di deploy sarà
 * fresco e conterrà solo valori conformi.
 */
export function localitaDaVoce(voce) {
  return formattaLocalita(voce?.comune, voce?.provincia) ?? '';
}

/** Copia della voce con un solo campo cambiato. */
export function aggiornaVoce(voce, campo, valore) {
  return { ...voce, [campo]: valore };
}

/**
 * Copia dell'elenco con una voce vuota in coda, dello stesso tipo dell'ultima.
 * Il chiamante non la invoca oltre `LIMITE_VOCI`: il limite è della schermata,
 * che disabilita il pulsante; qui non si tronca in silenzio.
 */
export function aggiungiVoce(voci) {
  const ultima = voci[voci.length - 1];
  if (!ultima) {
    throw new Error(
      "aggiungiVoce richiede almeno una voce: il tipo della nuova arriva dall'ultima.",
    );
  }
  return [...voci, nuovaVoce(ultima.tipo)];
}

/**
 * Il tetto è raggiunto: nessuna voce nuova di questo tipo. Un elenco può
 * superare `LIMITE_VOCI` (voci pubblicate prima del tetto o da un altro
 * client), quindi il tetto blocca chi **aggiunge**, non chi elenca: la
 * schermata deve dire il vero su entrambe le cose.
 *
 * Con una voce per tipo obbligatoria il tetto si tocca solo nell'elenco, perché
 * la voce c'è sempre: qui non serve nessun filtro sullo stato né sul tipo — chi
 * chiama passa l'elenco completo del tipo (`(tabs)/offer-and-request.jsx`
 * divide per tipo e mai per stato).
 */
export function limiteRaggiunto(voci) {
  return voci.length >= LIMITE_VOCI;
}

/**
 * Il conteggio accanto al titolo di una sezione: quante voci ci sono su quante
 * se ne possono aggiungere. Oltre il tetto il rapporto non esiste più («7 di
 * 5»), quindi si dice solo quante ce ne sono: un numero impossibile rende
 * inaffidabile ogni altro numero della schermata (audit UX F04).
 */
export function testoConteggioVoci(voci) {
  const quanti = voci.length;
  return quanti > LIMITE_VOCI ? `${quanti} voci` : `${quanti} di ${LIMITE_VOCI}`;
}

/**
 * La frase del limite raggiunto, costruita sul numero che l'utente ha davanti.
 *
 * Con più voci del tetto — voci pubblicate prima che il limite esistesse, o da
 * un altro percorso — la frase costruita sulla costante («Hai raggiunto il
 * massimo di …») accanto a un conteggio più alto si contraddice da sola (audit
 * UX F92): qui la frase nomina il conteggio e dice cosa si può fare. Da quando
 * una voce per tipo è obbligatoria e si può solo modificare, «eliminane una»
 * sarebbe un consiglio impossibile da seguire: le voci in più restano, si
 * correggono e non se ne aggiungono altre.
 */
export function testoLimiteVoci(voci, tipo) {
  const quanti = voci.length;
  if (quanti > LIMITE_VOCI) {
    return `Massimo raggiunto: hai ${quanti} ${sostantivoVoce(tipo, quanti)}, il massimo è ${LIMITE_VOCI}. Puoi modificare quelle che hai, non aggiungerne altre.`;
  }
  return `Hai raggiunto il massimo di ${LIMITE_VOCI} ${sostantivoVoce(tipo, LIMITE_VOCI)}.`;
}

/**
 * Errori della singola voce, con messaggi in italiano: oggetto vuoto = voce valida.
 * Le chiavi sono i campi del modulo (`idCategoria`, `mansione`).
 *
 * `categorie` è l'elenco caricato dal layer API: la categoria è valida solo se è
 * un intero presente in quell'elenco, perché gli id sono il contratto con il
 * backend e il nome no.
 */
export function validaVoce(voce, categorie = []) {
  const errori = {};

  if (nomeCategoria(categorie, voce.idCategoria) === null) {
    errori.idCategoria = 'Scegli una categoria.';
  }

  const mansione = voce.mansione.trim();
  if (!mansione) {
    errori.mansione =
      voce.tipo === TIPI_VOCE.RICERCA ? 'Descrivi cosa cerchi.' : 'Descrivi la mansione.';
  } else if (mansione.length > LIMITE_MANSIONE) {
    errori.mansione = `Massimo ${LIMITE_MANSIONE} caratteri.`;
  }

  // La località è facoltativa e derivata da provincia/comune: si controlla solo
  // la lunghezza, come rete di sicurezza se il dataset cambiasse.
  const localita = localitaDaVoce(voce);
  if (localita.length > LIMITE_LOCALITA) {
    errori.localita = `Massimo ${LIMITE_LOCALITA} caratteri.`;
  }

  return errori;
}

/**
 * Errori della voce che manca: gli stessi campi vuoti di `nuovaVoce`, senza
 * consumare una chiave del contatore (questa funzione non crea voci).
 */
function voceMancante(tipo) {
  return { tipo, idCategoria: null, mansione: '', provincia: '', comune: '' };
}

/** Le due sezioni che la registrazione non può lasciare vuote. */
const SEZIONI_VOCI_OBBLIGATORIE = [
  { chiave: 'offerte', tipo: TIPI_VOCE.OFFERTA },
  { chiave: 'ricerche', tipo: TIPI_VOCE.RICERCA },
];

/**
 * La regola della registrazione: **un'offerta e una ricerca, entrambe
 * compilate**. Ogni account deve poter entrare nel match dal primo istante,
 * quindi una sezione senza voci non si salta come faceva il form quando le voci
 * erano facoltative: è la voce obbligatoria che manca.
 *
 * `voci` è `{ offerte, ricerche }`, le due liste del form. Gli errori hanno le
 * chiavi che il form disegna (`offerte.0.mansione`), così un errore cade sotto
 * il campo giusto; una lista vuota produce gli errori della riga 0, che è il
 * posto dove la voce mancante andrebbe.
 */
export function validaVociRegistrazione(voci, categorie = []) {
  const errori = {};
  SEZIONI_VOCI_OBBLIGATORIE.forEach(({ chiave, tipo }) => {
    const elenco = Array.isArray(voci?.[chiave]) ? voci[chiave] : [];
    const righe = elenco.length > 0 ? elenco : [voceMancante(tipo)];
    righe.forEach((voce, indice) => {
      Object.entries(validaVoce(voce, categorie)).forEach(([campo, messaggio]) => {
        errori[`${chiave}.${indice}.${campo}`] = messaggio;
      });
    });
  });
  return errori;
}

/**
 * Etichetta della categoria a partire dall'id. La voce non contiene il nome:
 * il nome si risolve sempre dalla lista caricata, così non nasce un secondo
 * posto in cui il nome può divergere.
 */
export function nomeCategoria(categorie, idCategoria) {
  if (idCategoria === null || idCategoria === undefined || !Array.isArray(categorie)) {
    return null;
  }
  const trovata = categorie.find((categoria) => Number(categoria.id) === Number(idCategoria));
  return trovata && typeof trovata.nome === 'string' ? trovata.nome : null;
}

/**
 * Tono del chip dello stato di pubblicazione: `service` per «Pubblicata»,
 * `info` (neutro) per «Sospesa» e per uno stato che non conosciamo.
 * Il colore non è mai l'unico segnale: la parola sta sempre accanto.
 */
export function tonoStatoPubblicazione(stato) {
  return stato === STATI_PUBBLICAZIONE.PUBBLICATA ? 'service' : 'info';
}

/**
 * «da remoto» oppure «in presenza»: la casella non spuntata non deve restare
 * ambigua, quindi la modalità si scrive quando il valore è noto. Chi non la
 * conosce (i candidati di «Loop», dove il contratto non la modella) non chiama
 * questa funzione e non mostra la riga.
 */
export function etichettaModalita(daRemoto) {
  return daRemoto === true ? 'da remoto' : 'in presenza';
}

/**
 * Il nome leggibile di una persona: nome e cognome, altrimenti lo username.
 * La usano la card del catalogo, il dettaglio e (domani) lo swipe: sta qui per
 * non avere tre copie della stessa riga.
 */
export function nomePersona(persona) {
  const completo = [persona?.nome, persona?.cognome].filter(Boolean).join(' ');
  return completo || persona?.username || 'Utente';
}

/** Copia dell'oggetto senza una chiave: gli errori si aggiornano sempre in copia. */
export function senzaChiave(oggetto, chiave) {
  const copia = { ...oggetto };
  delete copia[chiave];
  return copia;
}

/** Copia dell'oggetto senza tutte le chiavi che cominciano con un prefisso. */
export function senzaPrefisso(oggetto, prefisso) {
  return Object.fromEntries(
    Object.entries(oggetto).filter(([chiave]) => !chiave.startsWith(prefisso)),
  );
}

// ---------------------------------------------------------------------------
// I filtri del catalogo (home e swipe)
//
// La **forma** dei filtri e le sue funzioni pure stanno qui, accanto alla forma
// della voce, per lo stesso motivo: la useranno la home e lo swipe, e la regola
// non deve vivere dentro una schermata. La **semantica del confronto** (maiuscole,
// accenti, quali campi guarda il testo) non sta qui: è una decisione del backend
// (`ServiceRepository::paginateHomepageOffers` fa le LIKE su `description` e
// sulla località del servizio, `service.location`). Il filtro località non è più testo libero: è
// provincia + comune dal dataset statico, composti in una stringa (stessa
// semantica `LIKE` del backend: sola provincia = l'intera provincia, provincia +
// comune = quel comune).
//
// Il filtro **modalità** va al server: `GET /api/services` accetta
// `isRemote=true|false` (assente = entrambe le modalità), e l'ordinamento per
// rilevanza — priorità alle categorie delle richieste del viewer — lo decide il
// backend su tutto il catalogo prima di paginare. Qui resta solo la forma dei
// filtri e la loro traduzione in query.
// ---------------------------------------------------------------------------

/**
 * Le tre scelte del filtro modalità della home. `''` = tutti (nessun
 * filtro), `'REMOTO'` = solo da remoto (`isRemote=true`), `'PRESENZA'` = solo
 * in presenza (`isRemote=false`).
 */
export const VALORI_MODALITA = { TUTTE: '', REMOTO: 'REMOTO', PRESENZA: 'PRESENZA' };

export const SCELTE_FILTRO_MODALITA = [
  { valore: VALORI_MODALITA.TUTTE, etichetta: 'Tutti' },
  { valore: VALORI_MODALITA.REMOTO, etichetta: 'Solo da remoto' },
  { valore: VALORI_MODALITA.PRESENZA, etichetta: 'Solo in presenza' },
];

/** L'etichetta del valore del filtro modalità (`''` → 'Tutti'). */
export function etichettaValoreModalita(valore) {
  const trovata = SCELTE_FILTRO_MODALITA.find((scelta) => scelta.valore === valore);
  return trovata ? trovata.etichetta : 'Tutti';
}

/** Il valore del filtro dalla sua etichetta (per il `ListSelector`). */
export function valoreDaEtichettaModalita(etichetta) {
  const trovata = SCELTE_FILTRO_MODALITA.find((scelta) => scelta.etichetta === etichetta);
  return trovata ? trovata.valore : VALORI_MODALITA.TUTTE;
}

/**
 * Lo stato vuoto dei filtri. Un solo punto: chi azzera e chi confronta usa
 * questa, così non nascono due definizioni di "nessun filtro".
 * Ogni chiamata restituisce un oggetto nuovo (nessuna condivisione mutabile).
 */
export function nuoviFiltri() {
  return {
    testo: '',
    idCategoria: null,
    provincia: '',
    comune: '',
    modalita: VALORI_MODALITA.TUTTE,
  };
}

/** Quante condizioni sono attive: per il testo «n filtri attivi» e per «Azzera filtri». */
export function contaFiltri(filtri) {
  let quanti = 0;
  if (typeof filtri.testo === 'string' && filtri.testo.trim() !== '') {
    quanti += 1;
  }
  if (Number.isInteger(filtri.idCategoria)) {
    quanti += 1;
  }
  // La località è una condizione sola: provincia più comune è una ricerca più
  // precisa, non due filtri.
  if (
    (typeof filtri.provincia === 'string' && filtri.provincia.trim() !== '') ||
    (typeof filtri.comune === 'string' && filtri.comune.trim() !== '')
  ) {
    quanti += 1;
  }
  if (filtri.modalita === VALORI_MODALITA.REMOTO || filtri.modalita === VALORI_MODALITA.PRESENZA) {
    quanti += 1;
  }
  return quanti;
}

/**
 * La forma di rete dei filtri per `GET /api/services`: le condizioni vuote si
 * **omettono**, non si spediscono come stringa vuota. I nomi dei parametri sono
 * quelli del contratto (`q`, `categoryIds`, `location`): la categoria è una sola
 * e viaggia come lista da un elemento, perché il contratto è una lista separata
 * da virgole.
 */
export function filtriDaQuery(filtri) {
  const testo = typeof filtri.testo === 'string' ? filtri.testo.trim() : '';
  const provincia = typeof filtri.provincia === 'string' ? filtri.provincia.trim() : '';
  const comune = typeof filtri.comune === 'string' ? filtri.comune.trim() : '';
  // Comune (se c'è) composto con la provincia, altrimenti la provincia **con il
  // separatore davanti**: `location` resta una stringa sola, come vuole il
  // contratto, e il backend la confronta con un LIKE su `service.location`. Il
  // separatore è quello che impedisce a «provincia Torino» di trovare
  // `Torino di Sangro - Chieti` (`formattaProvinciaPerFiltro`).
  const localita = comune ? formattaLocalita(comune, provincia) : formattaProvinciaPerFiltro(provincia);
  return {
    ...(testo ? { q: testo } : {}),
    ...(Number.isInteger(filtri.idCategoria) ? { categoryIds: filtri.idCategoria } : {}),
    ...(localita ? { location: localita } : {}),
    // La modalità viaggia come stringa (`isRemote=true|false`): il backend
    // rifiuta ogni altro valore con un 400. `''` (Tutti) non manda il parametro.
    ...(filtri.modalita === VALORI_MODALITA.REMOTO ? { isRemote: 'true' } : {}),
    ...(filtri.modalita === VALORI_MODALITA.PRESENZA ? { isRemote: 'false' } : {}),
  };
}

/** Riga leggibile dei filtri applicati, per lo stato vuoto («per “X”, categoria …»). */
export function descriviFiltri(filtri, categorie = []) {
  const parti = [];
  const testo = typeof filtri.testo === 'string' ? filtri.testo.trim() : '';
  if (testo) {
    parti.push(`“${testo}”`);
  }
  const categoria = nomeCategoria(categorie, filtri.idCategoria);
  if (categoria) {
    parti.push(`categoria ${categoria}`);
  }
  const comune = typeof filtri.comune === 'string' ? filtri.comune.trim() : '';
  const provincia = typeof filtri.provincia === 'string' ? filtri.provincia.trim() : '';
  const localita = comune ? formattaLocalita(comune, provincia) : null;
  if (localita) {
    parti.push(`località ${localita}`);
  } else if (provincia) {
    parti.push(`provincia ${provincia}`);
  }
  if (filtri.modalita === VALORI_MODALITA.REMOTO) {
    parti.push('solo da remoto');
  } else if (filtri.modalita === VALORI_MODALITA.PRESENZA) {
    parti.push('solo in presenza');
  }
  return parti.join(', ');
}


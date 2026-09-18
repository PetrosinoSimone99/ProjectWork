/**
 * Offerta e ricerca: la forma del dato e le sue regole, in un punto solo.
 *
 * È l'analogo di `src/accordi/stati.js` per gli accordi 1:1: logica di dominio
 * fuori dalle schermate. Le schermate che trattano le voci (registrazione,
 * pubblicazione, filtri, match) importano questo modulo e non ridichiarano
 * niente: se il backend cambia un nome di campo, si cambia qui.
 *
 * Nessuna funzione muta i dati ricevuti: copia, trasforma, restituisce.
 */

/** I due tipi di voce. Stringhe, perché viaggiano in JSON e finiscono nelle query. */
export const TIPI_VOCE = { OFFERTA: 'OFFERTA', RICERCA: 'RICERCA' };

/**
 * Limite del testo della mansione.
 * TODO(backend): confermare — la proposta ai colleghi (Parte 19) usa
 * `mansione VARCHAR(150)`, mentre `descrizione_servizio` è `VARCHAR(100)`.
 */
export const LIMITE_MANSIONE = 150;

/** Massimo di voci per tipo in registrazione (decisione del titolare, 16 settembre 2026). */
export const LIMITE_VOCI = 5;

/**
 * Limite della località dell'annuncio.
 * TODO(backend): confermare — oggi `richieste.php` ha `localita varchar(100)`.
 * In registrazione la località è della persona e vive fuori dalla voce.
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
 * @property {string} localita      località dell'annuncio: '' in registrazione
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
    localita: '',
    stato: null,
    id: null,
  };
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

/** Copia dell'elenco senza la voce con quella chiave. */
export function rimuoviVoce(voci, chiave) {
  return voci.filter((voce) => voce.chiave !== chiave);
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

  // La località è facoltativa: si controlla solo la lunghezza, come rete di
  // sicurezza per un incollaggio da tastiera (il campo ha già `maxLength`).
  const localita = typeof voce.localita === 'string' ? voce.localita.trim() : '';
  if (localita.length > LIMITE_LOCALITA) {
    errori.localita = `Massimo ${LIMITE_LOCALITA} caratteri.`;
  }

  return errori;
}

/**
 * Le voci nella forma di rete. Il `trim` dei testi si fa qui una volta sola:
 * la forma di rete è una funzione di questo modulo, non uno spread fatto a mano
 * nella schermata.
 */
export function aPayloadApi(voci) {
  return voci.map((voce) => ({
    id_categoria: voce.idCategoria,
    mansione: voce.mansione.trim(),
    da_remoto: voce.daRemoto === true,
  }));
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

/** Riga leggibile di una voce, per i riepiloghi (schermata 2: Offro e cerco). */
export function descriviVoce(voce, categorie) {
  const categoria = nomeCategoria(categorie, voce.idCategoria) ?? 'Categoria da scegliere';
  const mansione = voce.mansione.trim() || 'Mansione da descrivere';
  const modalita = etichettaModalita(voce.daRemoto);
  return `${categoria} · ${mansione} · ${modalita}`;
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
 * ambigua, quindi la modalità si scrive sempre.
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

/**
 * La voce nella forma di rete della **pubblicazione** (creazione), diversa da
 * quella della registrazione: qui viaggia anche la località dell'annuncio.
 * Una località vuota si omette invece di spedire `""`, come già fa il backend
 * di oggi con `richieste.php` (stringa vuota salvata come `NULL`).
 */
export function aPayloadPubblicazione(voce) {
  const localita = typeof voce.localita === 'string' ? voce.localita.trim() : '';
  return {
    tipo: voce.tipo,
    id_categoria: voce.idCategoria,
    mansione: voce.mansione.trim(),
    da_remoto: voce.daRemoto === true,
    ...(localita ? { localita } : {}),
  };
}

/** Come `aPayloadPubblicazione`, più l'id della voce da modificare. */
export function aPayloadAggiornamento(voce) {
  return { ...aPayloadPubblicazione(voce), id: voce.id };
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
// e vive nel finto con il suo `// TODO(backend)`.
// ---------------------------------------------------------------------------

/**
 * Le tre scelte del filtro modalità. `null` = non restringe, `true` = solo da
 * remoto, `false` = solo in presenza. Tre stati e non una casella perché un
 * servizio può essere offerto in entrambi i modi.
 */
export const SCELTE_MODALITA = [
  { valore: null, etichetta: 'Tutti' },
  { valore: true, etichetta: 'Da remoto' },
  { valore: false, etichetta: 'In presenza' },
];

/**
 * Lo stato vuoto dei filtri. Un solo punto: chi azzera e chi confronta usa
 * questa, così non nascono due definizioni di "nessun filtro".
 * Ogni chiamata restituisce un oggetto nuovo (nessuna condivisione mutabile).
 */
export function nuoviFiltri() {
  return { testo: '', idCategoria: null, localita: '', modalita: null };
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
  if (typeof filtri.localita === 'string' && filtri.localita.trim() !== '') {
    quanti += 1;
  }
  if (filtri.modalita !== null && filtri.modalita !== undefined) {
    quanti += 1;
  }
  return quanti;
}

/**
 * La forma di rete dei filtri: le condizioni vuote si **omettono**, non si
 * spediscono come stringa vuota. `modalita` viaggia come `'remoto' | 'presenza'`
 * e «tutti» si omette: nessun `0` da interpretare come "assente".
 */
export function filtriDaQuery(filtri) {
  const testo = typeof filtri.testo === 'string' ? filtri.testo.trim() : '';
  const localita = typeof filtri.localita === 'string' ? filtri.localita.trim() : '';
  const modalita =
    filtri.modalita === true ? 'remoto' : filtri.modalita === false ? 'presenza' : null;
  return {
    ...(testo ? { q: testo } : {}),
    ...(Number.isInteger(filtri.idCategoria) ? { id_categoria: filtri.idCategoria } : {}),
    ...(localita ? { localita } : {}),
    ...(modalita ? { modalita } : {}),
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
  const localita = typeof filtri.localita === 'string' ? filtri.localita.trim() : '';
  if (localita) {
    parti.push(`località ${localita}`);
  }
  if (filtri.modalita !== null && filtri.modalita !== undefined) {
    parti.push(etichettaModalita(filtri.modalita));
  }
  return parti.join(', ');
}


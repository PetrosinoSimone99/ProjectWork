/**
 * Finti: il catalogo dei servizi della home.
 *
 * Serve perché `finti/servizi.js` contiene **solo il deposito dell'utente
 * corrente**: il catalogo sono i servizi di tutti, ed è la ragione per cui un
 * file nuovo è giusto e non un allargamento di quello. Le proprie pubblicazioni
 * **non** si uniscono al catalogo (decisione del titolare: in home si vedono solo
 * i servizi degli altri), quindi qui non si legge `finti/servizi.js`.
 *
 * Stessa forma della risposta dell'endpoint proposto
 * (`{success, message, data:{servizi:[…]}}`) e stessa forma di rete piatta di
 * `servizi.php` (`id`, `tipo`, `id_categoria`, `mansione`, `da_remoto`,
 * `localita`, `stato`) più l'`offerente`: il bivio in `api/barattolo.js`
 * normalizza un solo tipo di dato, quindi il finto è fedele all'endpoint e non
 * alla schermata.
 *
 * La **semantica del filtro è dichiarata finta**: la decide l'endpoint vero.
 * Il filtraggio sta qui (non nella schermata) perché è il backend che ha i dati
 * di tutti e dovrà reggere il volume.
 */

/**
 * Due attese diverse, dichiarate e volute:
 * - la prima rende rappresentabile lo stato di caricamento dei filtri e della
 *   home (senza, non si vedrebbe mai);
 * - la seconda fa "pesare" una ricerca testuale, così è possibile **osservare**
 *   la guardia sulle risposte fuori ordine: si filtra per testo (900 ms), si
 *   preme subito «Azzera filtri» (250 ms) e la risposta dell'azzeramento arriva
 *   per prima; quella del testo, in ritardo, deve essere ignorata.
 */
const ATTESA_CATALOGO_MS = 250;
const ATTESA_TESTO_MS = 900;

/**
 * I 12 servizi segnaposto: tutti di **altri** utenti (gli id degli offerenti
 * sono alti di proposito, così non collidono mai con l'id di chi si registra
 * nella demo). Nomi e località sono chiaramente finti.
 *
 * TODO(backend): `GET catalogo.php` → la stessa forma, con i servizi pubblicati
 * e attivi di tutti. Le voci qui sotto sono segnaposto, non dati reali.
 * La scelta è tarata per far vedere che i filtri funzionano: due offerte a
 * Firenze (il filtro località deve restituirne più di una), 4 da remoto e 8 in
 * presenza, una **senza località** (il caso esiste ed è un dato reale), dieci
 * categorie diverse, «ripetizioni» in due mansioni e nessuna offerta da remoto a
 * Firenze (località + «da remoto» devono dare zero: è la prova che i filtri si
 * intersecano).
 */
const SERVIZI_FINTI = [
  {
    id: 1,
    tipo: 'OFFERTA',
    id_categoria: 1,
    mansione: 'Ripetizioni di analisi matematica per il biennio',
    da_remoto: false,
    localita: 'Firenze',
    stato: 'PUBBLICATA',
    offerente: {
      id: 101,
      username: 'mario.rossi',
      nome: 'Mario',
      cognome: 'Rossi',
      localita: 'Firenze',
    },
  },
  {
    id: 2,
    tipo: 'OFFERTA',
    id_categoria: 1,
    mansione: 'Ripetizioni di inglese: conversazione per adulti',
    da_remoto: true,
    localita: '',
    stato: 'PUBBLICATA',
    offerente: {
      id: 102,
      username: 'giulia.bianchi',
      nome: 'Giulia',
      cognome: 'Bianchi',
      localita: 'Milano',
    },
  },
  {
    id: 3,
    tipo: 'OFFERTA',
    id_categoria: 2,
    mansione: 'Montaggio mobili e piccole riparazioni in casa',
    da_remoto: false,
    localita: 'Bologna',
    stato: 'PUBBLICATA',
    offerente: {
      id: 103,
      username: 'luca.ferrari',
      nome: 'Luca',
      cognome: 'Ferrari',
      localita: 'Bologna',
    },
  },
  {
    id: 4,
    tipo: 'OFFERTA',
    id_categoria: 3,
    mansione: 'Riparazione PC e sostituzione di schermi',
    da_remoto: false,
    localita: 'Torino',
    stato: 'PUBBLICATA',
    offerente: {
      id: 104,
      username: 'anna.conti',
      nome: 'Anna',
      cognome: 'Conti',
      localita: 'Torino',
    },
  },
  {
    id: 5,
    tipo: 'OFFERTA',
    id_categoria: 3,
    mansione: 'Installazione di Linux e recupero dati',
    da_remoto: true,
    localita: '',
    stato: 'PUBBLICATA',
    offerente: {
      id: 105,
      username: 'paolo.greco',
      nome: 'Paolo',
      cognome: 'Greco',
      localita: 'Napoli',
    },
  },
  {
    id: 6,
    tipo: 'OFFERTA',
    id_categoria: 4,
    mansione: "Potatura di siepi e cura dell'orto",
    da_remoto: false,
    localita: 'Padova',
    stato: 'PUBBLICATA',
    offerente: {
      id: 106,
      username: 'sara.marino',
      nome: 'Sara',
      cognome: 'Marino',
      localita: 'Padova',
    },
  },
  {
    id: 7,
    tipo: 'OFFERTA',
    id_categoria: 5,
    mansione: 'Pulizie di fine trasloco',
    da_remoto: false,
    localita: 'Roma',
    stato: 'PUBBLICATA',
    offerente: {
      id: 107,
      username: 'elena.costa',
      nome: 'Elena',
      cognome: 'Costa',
      localita: 'Roma',
    },
  },
  {
    id: 8,
    tipo: 'OFFERTA',
    id_categoria: 6,
    mansione: 'Fogli di calcolo: formule e macro per piccole attività',
    da_remoto: true,
    localita: '',
    stato: 'PUBBLICATA',
    offerente: {
      id: 108,
      username: 'davide.rizzo',
      nome: 'Davide',
      cognome: 'Rizzo',
      localita: 'Bari',
    },
  },
  {
    id: 9,
    tipo: 'OFFERTA',
    id_categoria: 7,
    mansione: 'Ritratto fotografico in esterno',
    da_remoto: false,
    localita: 'Firenze',
    stato: 'PUBBLICATA',
    offerente: {
      id: 109,
      username: 'chiara.fontana',
      nome: 'Chiara',
      cognome: 'Fontana',
      localita: 'Firenze',
    },
  },
  {
    id: 10,
    tipo: 'OFFERTA',
    id_categoria: 8,
    mansione: 'Traduzioni italiano-inglese di lettere e documenti',
    da_remoto: true,
    localita: '',
    stato: 'PUBBLICATA',
    offerente: {
      id: 110,
      username: 'marco.serra',
      nome: 'Marco',
      cognome: 'Serra',
      localita: 'Genova',
    },
  },
  {
    id: 11,
    tipo: 'OFFERTA',
    id_categoria: 9,
    mansione: 'Piccoli lavori di bricolage e tinteggiatura',
    da_remoto: false,
    localita: '',
    stato: 'PUBBLICATA',
    offerente: {
      id: 111,
      username: 'ilaria.galli',
      nome: 'Ilaria',
      cognome: 'Galli',
      localita: 'Modena',
    },
  },
  {
    id: 12,
    tipo: 'OFFERTA',
    id_categoria: 10,
    mansione: 'Pet sitting per cani nei fine settimana',
    da_remoto: false,
    localita: 'Milano',
    stato: 'PUBBLICATA',
    offerente: {
      id: 112,
      username: 'federico.longo',
      nome: 'Federico',
      cognome: 'Longo',
      localita: 'Milano',
    },
  },
];

/** Copia in uscita: chi riceve il catalogo non può modificare quello del modulo. */
function copiaServizio(servizio) {
  return { ...servizio, offerente: { ...servizio.offerente } };
}

/**
 * Copie dei 12 servizi segnaposto, per chi ha bisogno delle **stesse persone**
 * senza passare dai filtri della home: oggi lo swipe (`finti/match.js`), che
 * così racconta un solo mondo — la persona vista in Home è la stessa vista in
 * «Loop». Restituisce copie, quindi chi la usa non può modificare il catalogo.
 */
export function elencoServiziFinti() {
  return SERVIZI_FINTI.map(copiaServizio);
}

/**
 * TODO(backend): la semantica dei filtri la decide l'endpoint — differenza fra
 * maiuscole e minuscole, accenti, quali campi guarda il testo (solo la mansione,
 * o anche la categoria e l'autore) e `LIKE` su parole non consecutive. Qui è
 * dichiarata finta: testo e località senza distinzione di maiuscole, `includes`,
 * e le condizioni combinate in **AND**.
 */
function passaIFiltri(servizio, filtri) {
  const testo = typeof filtri.testo === 'string' ? filtri.testo.trim().toLowerCase() : '';
  if (testo && !servizio.mansione.toLowerCase().includes(testo)) {
    return false;
  }

  if (
    Number.isInteger(filtri.idCategoria) &&
    Number(servizio.id_categoria) !== Number(filtri.idCategoria)
  ) {
    return false;
  }

  const localita = typeof filtri.localita === 'string' ? filtri.localita.trim().toLowerCase() : '';
  if (localita && !servizio.localita.toLowerCase().includes(localita)) {
    return false;
  }

  if (filtri.modalita === true && servizio.da_remoto !== true) {
    return false;
  }
  if (filtri.modalita === false && servizio.da_remoto !== false) {
    return false;
  }

  return true;
}

/**
 * TODO(backend): `GET catalogo.php?q=&id_categoria=&localita=&modalita=remoto|presenza`.
 * `utenteId` serve solo a tenere fuori una riga propria se per errore ci fosse:
 * è la difesa speculare a quella della normalizzazione, così la demo non può
 * mostrare qualcosa di diverso da quello che il backend dovrà produrre.
 */
export function ottieniCatalogo(utenteId, filtri = {}) {
  const richiesta = {
    testo: typeof filtri.testo === 'string' ? filtri.testo : '',
    idCategoria: filtri.idCategoria ?? null,
    localita: typeof filtri.localita === 'string' ? filtri.localita : '',
    modalita: filtri.modalita ?? null,
  };
  const attesa = richiesta.testo.trim() ? ATTESA_TESTO_MS : ATTESA_CATALOGO_MS;

  return new Promise((resolve) => {
    setTimeout(() => {
      const servizi = SERVIZI_FINTI.filter(
        (servizio) =>
          Number(servizio.offerente.id) !== Number(utenteId) && passaIFiltri(servizio, richiesta),
      ).map(copiaServizio);
      resolve({
        success: true,
        message: 'Servizi caricati.',
        data: { servizi },
      });
    }, attesa);
  });
}

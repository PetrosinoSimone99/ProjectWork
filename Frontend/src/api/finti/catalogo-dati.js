/**
 * Finti: i 12 servizi segnaposto, il **mondo** condiviso delle aree che restano
 * finte.
 *
 * Fino al 30 settembre 2026 questo era il finto del catalogo della home: da
 * quella data la home parla solo col backend vero (`GET /api/services`) e il suo
 * finto endpoint è stato cancellato (decisione del titolare). Restano questi
 * dati perché **non servono più alla home**: sono il seme condiviso del Loop
 * (`finti/match.js`), che con i finti deve
 * raccontare lo stesso mondo — la persona vista in «Loop» è una di queste.
 *
 * La forma delle righe resta quella piatta di `servizi.php` (`id`, `tipo`,
 * `id_categoria`, `mansione`, `da_remoto`, `localita`, `stato`) più l'`offerente`:
 * sono i due consumatori a leggerla così, e il contratto vero della home non
 * c'entra più.
 */

/**
 * I 12 servizi segnaposto: tutti di **altri** utenti (gli id degli offerenti
 * sono alti di proposito, così non collidono mai con l'id di chi si registra
 * nella demo). Nomi e località sono chiaramente finti, dieci categorie
 * diverse, una riga **senza località** (quel caso esiste ed è un dato reale).
 * Le voci sono segnaposto, non dati reali.
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

/** Copia in uscita: chi riceve i dati non può modificare quelli del modulo. */
function copiaServizio(servizio) {
  return { ...servizio, offerente: { ...servizio.offerente } };
}

/**
 * Copie dei 12 servizi segnaposto, per chi ha bisogno delle **stesse persone**
 * senza inventare un altro mondo: oggi lo swipe (`finti/match.js`).
 * Restituisce copie, quindi chi le usa non può
 * modificare questo modulo.
 */
export function elencoServiziFinti() {
  return SERVIZI_FINTI.map(copiaServizio);
}

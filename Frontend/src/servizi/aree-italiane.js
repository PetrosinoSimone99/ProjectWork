/**
 * Aree amministrative italiane: regioni e province (dataset statico del frontend).
 *
 * È statico e vive qui perché non esiste un endpoint "regioni/province" nel backend
 * e non va inventato (§3 AGENTS.md): l'utente sceglie dal dataset, il backend riceve
 * una sola stringa. Il formato scelto per la stringa è `Provincia (Regione)`
 * (es. `Milano (Lombardia)`) perché `users.location` è `varchar(255)` e il backend
 * non espone campi separati per regione e provincia: si serializzano in un'unica
 * stringa che il backend salva e restituisce così com'è.
 */

/** Costante: l'elenco ufficiale delle regioni d'Italia (20), con le province in ordine alfabetico. */
export const REGIONI = [
  {
    nome: "Abruzzo",
    province: ["Chieti", "L'Aquila", "Pescara", "Teramo"],
  },
  {
    nome: "Basilicata",
    province: ["Matera", "Potenza"],
  },
  {
    nome: "Calabria",
    province: ["Catanzaro", "Cosenza", "Crotone", "Reggio Calabria", "Vibo Valentia"],
  },
  {
    nome: "Campania",
    province: ["Avellino", "Benevento", "Caserta", "Napoli", "Salerno"],
  },
  {
    nome: "Emilia-Romagna",
    province: [
      "Bologna",
      "Ferrara",
      "Forlì-Cesena",
      "Modena",
      "Parma",
      "Piacenza",
      "Ravenna",
      "Reggio Emilia",
      "Rimini",
    ],
  },
  {
    nome: "Friuli-Venezia Giulia",
    province: ["Gorizia", "Pordenone", "Trieste", "Udine"],
  },
  {
    nome: "Lazio",
    province: ["Frosinone", "Latina", "Rieti", "Roma", "Viterbo"],
  },
  {
    nome: "Liguria",
    province: ["Genova", "Imperia", "La Spezia", "Savona"],
  },
  {
    nome: "Lombardia",
    province: [
      "Bergamo",
      "Brescia",
      "Como",
      "Cremona",
      "Lecco",
      "Lodi",
      "Mantova",
      "Milano",
      "Monza e Brianza",
      "Pavia",
      "Sondrio",
      "Varese",
    ],
  },
  {
    nome: "Marche",
    province: ["Ancona", "Ascoli Piceno", "Fermo", "Macerata", "Pesaro e Urbino"],
  },
  {
    nome: "Molise",
    province: ["Campobasso", "Isernia"],
  },
  {
    nome: "Piemonte",
    province: [
      "Alessandria",
      "Asti",
      "Biella",
      "Cuneo",
      "Novara",
      "Torino",
      "Verbano-Cusio-Ossola",
      "Vercelli",
    ],
  },
  {
    nome: "Puglia",
    province: ["Bari", "Barletta-Andria-Trani", "Brindisi", "Foggia", "Lecce", "Taranto"],
  },
  {
    nome: "Sardegna",
    province: ["Cagliari", "Nuoro", "Oristano", "Sassari", "Sud Sardegna"],
  },
  {
    nome: "Sicilia",
    province: [
      "Agrigento",
      "Caltanissetta",
      "Catania",
      "Enna",
      "Messina",
      "Palermo",
      "Ragusa",
      "Siracusa",
      "Trapani",
    ],
  },
  {
    nome: "Toscana",
    province: [
      "Arezzo",
      "Firenze",
      "Grosseto",
      "Livorno",
      "Lucca",
      "Massa-Carrara",
      "Pisa",
      "Pistoia",
      "Prato",
      "Siena",
    ],
  },
  {
    nome: "Trentino-Alto Adige",
    province: ["Bolzano", "Trento"],
  },
  {
    nome: "Umbria",
    province: ["Perugia", "Terni"],
  },
  {
    nome: "Valle d'Aosta",
    province: ["Aosta"],
  },
  {
    nome: "Veneto",
    province: ["Belluno", "Padova", "Rovigo", "Treviso", "Venezia", "Verona", "Vicenza"],
  },
];

/** Costante: il nome della regione con le maiuscole e gli spazi piegati a uno. */
const normalizzaNome = (testo) => String(testo ?? "").trim().replace(/\s+/g, " ");

/**
 * Ritorna la lista di province di una regione (copia, mai il riferimento interno).
 * @param {string} nomeRegione - Nome della regione (confronto non sensibile a maiuscole/spazi).
 * @returns {string[]} Province della regione, oppure `[]` se la regione è ignota.
 */
export function provincePerRegione(nomeRegione) {
  const chiave = normalizzaNome(nomeRegione).toLowerCase();
  if (!chiave) return [];
  const regione = REGIONI.find((r) => normalizzaNome(r.nome).toLowerCase() === chiave);
  return regione ? [...regione.province] : [];
}

/**
 * Composta la stringa di località nel formato che va in `users.location`.
 * Una sola stringa perché `users.location` è `varchar(255)` e il backend non ha
 * campi separati per regione e provincia.
 * @param {string|null} provincia - Nome della provincia (forma breve da etichetta UI).
 * @param {string|null} regione - Nome della regione.
 * @returns {string|null} `Provincia (Regione)` oppure `null` se manca uno dei due.
 */
export function formattaLocalita(provincia, regione) {
  const prov = normalizzaNome(provincia);
  const reg = normalizzaNome(regione);
  if (!prov || !reg) return null;
  return `${prov} (${reg})`;
}

/**
 * Legge il valore grezzo salvato in `location` e recupera la coppia provincia/regione,
 * ma solo se il testo rispetta il formato `Provincia (Regione)` e la coppia esiste
 * davvero nel dataset (case-insensitive, spazi normalizzati).
 * @param {string|null|undefined} testo - Valore grezzo salvato nel campo `location`.
 * @returns {{ provincia: string, regione: string }|null} Coppia trovata, altrimenti `null`
 *   (stringa vuota, parentesi mancanti, provincia ignota o nella regione sbagliata).
 */
export function analizzaLocalita(testo) {
  const match = normalizzaNome(testo).match(/^(.+) \((.+)\)$/);
  if (!match) return null;
  const [, provinciaGrezza, regioneGrezza] = match;

  const regione = REGIONI.find(
    (r) => normalizzaNome(r.nome).toLowerCase() === normalizzaNome(regioneGrezza).toLowerCase()
  );
  if (!regione) return null;

  const provincia = regione.province.find(
    (p) => normalizzaNome(p).toLowerCase() === normalizzaNome(provinciaGrezza).toLowerCase()
  );
  if (!provincia) return null;

  return { provincia, regione: regione.nome };
}

/**
 * La località nella forma da mostrare in UI: `Provincia (Regione)` con la grafia ufficiale
 * del dataset se il valore è riconoscibile, altrimenti il testo grezzo trimmato
 * (decisione 13/10/2026: un dato non conforme non si nasconde né si inventa).
 * @param {string|null|undefined} testo - Valore grezzo salvato in `location`.
 * @returns {string} Località pronta da mostrare, o `''` se non c'è nulla da mostrare.
 */
export function localitaPerDisplay(testo) {
  const grezzo = normalizzaNome(testo);
  const coppia = analizzaLocalita(grezzo);
  return coppia ? formattaLocalita(coppia.provincia, coppia.regione) : grezzo;
}

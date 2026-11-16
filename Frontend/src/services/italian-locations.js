import provinceComuni from './data/province-comuni.json';

/**
 * Italian administrative areas as the frontend needs them: province and comune.
 *
 * The dataset is static and lives here because no backend endpoint serves it
 * (`GET /api/categories` is the only catalog the API exposes) and inventing one
 * is out of scope: the person picks from this dataset, the backend receives a
 * single string. The chosen serialization is `Comune - Provincia`
 * (`Roma - Roma`, `Sesto San Giovanni - Milano`) because `users.location`,
 * `services.location` and `service_queues.location` are single `varchar`
 * columns with no per-field siblings, and because the queue match compares the
 * string with **exact equality**: one composer, one parser, one format.
 *
 * `province-comuni.json` is a verbatim copy of
 * `Context_and_DB_V2/province-comuni.json` (upstream `7408f52`), which stays
 * read-only: 110 provinces, 7.894 comuni. One comune name contains the
 * separator itself (`Tripi - Abakainon`, Messina), so parsing splits on the
 * **last** separator, never on the first.
 */

/** The separator between the two halves of a composed location. */
const SEPARATOR = ' - ';

/** Trimmed, single-spaced text; the comparison fold for names. */
const normalizza = (testo) => String(testo ?? '').trim().replace(/\s+/g, ' ');

/** The fold used for lookups: case-insensitive, accents left alone. */
const chiave = (testo) => normalizza(testo).toLowerCase();

/**
 * The 110 province names, alphabetical, in the exact spelling of the dataset
 * (`Bolzano/Bozen`, `Reggio nell'Emilia`, `Valle d'Aosta/Vallée d'Aoste`,
 * `Monza e della Brianza`). Read-only for callers: a frozen array.
 */
export const PROVINCE = Object.freeze(Object.keys(provinceComuni).sort((a, b) => a.localeCompare(b, 'it')));

/**
 * The comuni of a province (a copy, never the internal array).
 * @param {string|null|undefined} nomeProvincia - Province name, case-insensitive.
 * @returns {string[]} The comuni, or `[]` when the province is unknown.
 */
export function comuniPerProvincia(nomeProvincia) {
  const cercata = chiave(nomeProvincia);
  if (!cercata) {
    return [];
  }
  const trovata = PROVINCE.find((provincia) => chiave(provincia) === cercata);
  return trovata ? [...provinceComuni[trovata]] : [];
}

/**
 * Composes the string that travels in `location`.
 * @param {string|null|undefined} comune - Comune name from the dataset.
 * @param {string|null|undefined} provincia - Province name from the dataset.
 * @returns {string|null} `Comune - Provincia`, or `null` when either half is missing.
 */
export function formattaLocalita(comune, provincia) {
  const nomeComune = normalizza(comune);
  const nomeProvincia = normalizza(provincia);
  if (!nomeComune || !nomeProvincia) {
    return null;
  }
  return `${nomeComune}${SEPARATOR}${nomeProvincia}`;
}

/**
 * Reads a stored `location` back into its two halves, only when the text has the
 * composed shape **and** the pair really exists in the dataset (an old
 * `Milano (Lombardia)` or a bare `Roma` gives `null`, so the caller decides how
 * to show a value written before this format).
 * @param {string|null|undefined} testo - Raw `location`.
 * @returns {{comune: string, provincia: string}|null} The pair, canonically spelled.
 */
export function analizzaLocalita(testo) {
  const grezza = normalizza(testo);
  // The last separator, not the first: `Tripi - Abakainon - Messina`.
  const taglio = grezza.lastIndexOf(SEPARATOR);
  if (taglio <= 0) {
    return null;
  }
  const comuneGrezzo = grezza.slice(0, taglio);
  const provinciaGrezza = grezza.slice(taglio + SEPARATOR.length);
  const provincia = PROVINCE.find((nome) => chiave(nome) === chiave(provinciaGrezza));
  if (!provincia) {
    return null;
  }
  // Same name in five other provinces: the pair must exist, not the name alone.
  const comune = provinceComuni[provincia].find((nome) => chiave(nome) === chiave(comuneGrezzo));
  return comune ? { comune, provincia } : null;
}

/**
 * The location as the UI shows it: the composed form in the dataset's official
 * spelling when the value is recognizable, otherwise the trimmed raw text.
 * A value that does not match the format is shown, never hidden and never
 * rewritten (decision of 13 October 2026, still in force).
 * @param {string|null|undefined} testo - Raw `location`.
 * @returns {string} Ready-to-render location, or `''` when there is nothing.
 */
export function localitaPerDisplay(testo) {
  const grezza = normalizza(testo);
  const coppia = analizzaLocalita(grezza);
  return coppia ? formattaLocalita(coppia.comune, coppia.provincia) : grezza;
}

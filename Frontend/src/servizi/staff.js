/**
 * L'area staff: la logica pura dell'esame di una segnalazione.
 *
 * È il quinto modulo di dominio, accanto a `offerta-ricerca.js`, `candidati.js`,
 * `coda.js` e `segnalazioni.js`. Qui c'è **il lavoro della staff**: gli esiti
 * della chiusura, le regole della loro combinazione, la validazione e il corpo di
 * rete delle due azioni. Gli stati della segnalazione (`OPEN`, `IN_REVIEW`,
 * `CLOSED`), le loro etichette e i loro toni restano in `segnalazioni.js`: sono
 * gli stessi della segnalazione e ridichiararli qui sarebbe una seconda verità.
 *
 * Quattro cose che questo modulo **non** fa, di proposito:
 * - **non protegge niente**: la UI nasconde le azioni, il backend decide. Qui si
 *   dice solo se un'azione è coerente con lo stato mostrato, perché un pulsante
 *   su una pratica già chiusa è un errore da evitare, non un permesso;
 * - **non inventa gli esiti**: sono la proposta decisa il 18 settembre 2026 e i
 *   nomi definitivi li decidono i colleghi. Uno ignoto si mostra **grezzo**;
 * - **non decide chi riceve il token**: lo sceglie la staff dall'elenco dei
 *   partecipanti (in una catena i danneggiati possono essere più di uno). Qui si
 *   verifica solo che, con `TOKEN_ASSEGNATO`, il beneficiario ci sia;
 * - **non muta i dati ricevuti**: copia, trasforma, restituisce.
 *
 * La regola di prodotto più delicata è l'**esclusività** di «nessun
 * provvedimento»: chi lo sceglie non può combinarlo con gli altri, perché gli
 * altri dicono che un provvedimento c'è stato. Le tre scelte vere si combinano
 * fra loro (per esempio sospendere **e** dare il token).
 */

import { nomePersona } from './offerta-ricerca';
import { STATI_SEGNALAZIONE, etichettaMotivo, testoRiferimento } from './segnalazioni';

/**
 * Gli esiti della chiusura, decisi dal titolare il 18 settembre 2026. Sono una
 * **proposta** del frontend: il backend rifiuta un esito non ammesso (`400`) e i
 * nomi definitivi li decidono i colleghi. `NESSUN_PROVVEDIMENTO` è l'unico
 * esclusivo; gli altri tre si combinano.
 */
export const ESITI_CHIUSURA = {
  NESSUN_PROVVEDIMENTO: 'NESSUN_PROVVEDIMENTO',
  UTENTE_SOSPESO: 'UTENTE_SOSPESO',
  UTENTE_BLOCCATO: 'UTENTE_BLOCCATO',
  TOKEN_ASSEGNATO: 'TOKEN_ASSEGNATO',
};

/** Le etichette italiane degli esiti, nella forma dell'elenco a scelte della schermata. */
export const ETICHETTE_ESITO = {
  [ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO]: 'Nessun provvedimento',
  [ESITI_CHIUSURA.UTENTE_SOSPESO]: 'Utente sospeso',
  [ESITI_CHIUSURA.UTENTE_BLOCCATO]: 'Utente bloccato',
  [ESITI_CHIUSURA.TOKEN_ASSEGNATO]: 'Token alla vittima',
};

/** L'elenco degli esiti nell'ordine in cui si mostrano, per non dettarlo nella schermata. */
export const ELENCO_ESITI = [
  ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO,
  ESITI_CHIUSURA.UTENTE_SOSPESO,
  ESITI_CHIUSURA.UTENTE_BLOCCATO,
  ESITI_CHIUSURA.TOKEN_ASSEGNATO,
];

/**
 * Il limite della nota, dichiarato **qui** e non nel componente: è una regola del
 * form, come `LIMITE_DESCRIZIONE` per la segnalazione. Il `maxLength` del campo e
 * il controllo di `validaChiusura` leggono lo stesso numero.
 */
export const LIMITE_NOTA = 500;

/** `true` finché la pratica è aperta e nessuno l'ha presa in carico. */
export function puoPrendereInCarico(segnalazione) {
  return segnalazione?.stato === STATI_SEGNALAZIONE.OPEN;
}

/**
 * `true` finché la pratica non è chiusa: si può chiudere sia una segnalazione
 * appena arrivata sia una già presa in carico. Una chiusa non si richiude.
 */
export function puoiChiudere(segnalazione) {
  const stato = segnalazione?.stato;
  return stato === STATI_SEGNALAZIONE.OPEN || stato === STATI_SEGNALAZIONE.IN_REVIEW;
}

/**
 * Se una casella degli esiti è selezionabile **adesso**. «Nessun provvedimento»
 * lo è sempre (è l'unico modo di tornare indietro da una combinazione); gli altri
 * tre lo sono solo se «nessun provvedimento» non è scelto.
 */
export function puoSelezionare(esiti, esito) {
  const scelti = Array.isArray(esiti) ? esiti : [];
  if (esito === ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO) {
    return true;
  }
  return !scelti.includes(ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO);
}

/**
 * La selezione dopo aver toccato una casella. Le due regole di prodotto stanno
 * qui, non nella schermata:
 * - «nessun provvedimento» è **esclusivo**: sceglierlo svuota gli altri, e
 *   ritoccarlo quando è l'unico scelto lo toglie;
 * - un esito vero **toglie** «nessun provvedimento» e si aggiunge agli altri,
 *   perché i tre veri si combinano.
 */
export function conEsito(esiti, esito) {
  const scelti = Array.isArray(esiti) ? esiti : [];
  if (esito === ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO) {
    const soloQuesto = scelti.length === 1 && scelti[0] === esito;
    return soloQuesto ? [] : [esito];
  }
  if (scelti.includes(esito)) {
    return scelti.filter((valore) => valore !== esito);
  }
  return [...scelti.filter((valore) => valore !== ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO), esito];
}

/** `true` solo con `TOKEN_ASSEGNATO`: in quel caso serve sapere **a chi** va il buono. */
export function richiedeToken(esiti) {
  return Array.isArray(esiti) && esiti.includes(ESITI_CHIUSURA.TOKEN_ASSEGNATO);
}

/**
 * La validazione della chiusura, campo per campo: un messaggio per ogni campo non
 * valido e **nessuna chiave** quando va bene, come `validaSegnalazione`. Vuoto
 * significa valido, così la schermata decide il pulsante con
 * `Object.keys(errori).length === 0` e non con una seconda regola.
 *
 * Regole: almeno un esito; la nota è obbligatoria quando c'è un provvedimento
 * (con il solo «nessun provvedimento» non serve); la nota entro il limite; il
 * beneficiario obbligatorio con `TOKEN_ASSEGNATO`. Il resto lo decide il backend
 * (`400`, `403`, `409`).
 */
export function validaChiusura(esiti, nota, idBeneficiario = null) {
  const errori = {};
  const scelti = Array.isArray(esiti) ? esiti : [];
  const soloNessunProvvedimento =
    scelti.length === 1 && scelti[0] === ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO;

  if (scelti.length === 0) {
    errori.esiti = 'Scegli almeno un esito.';
  }

  const testo = typeof nota === 'string' ? nota.trim() : '';
  if (scelti.length > 0 && !soloNessunProvvedimento && testo === '') {
    errori.nota = "Scrivi la nota: l'esito cambia la vita di una persona e va motivato.";
  } else if (testo.length > LIMITE_NOTA) {
    errori.nota = `La nota può avere al massimo ${LIMITE_NOTA} caratteri.`;
  }

  if (richiedeToken(scelti) && (idBeneficiario === null || idBeneficiario === undefined)) {
    errori.beneficiario = 'Scegli chi riceve il token.';
  }

  return errori;
}

/**
 * Una riga in italiano che riassume la segnalazione per la card: «Non ha svolto
 * il servizio promesso — Giulia Bianchi segnala Mario Rossi — la catena #12».
 * `null` solo quando non c'è niente da dire. La schermata non ricompone il testo:
 * la sintesi è una regola di prodotto e sta qui.
 */
export function descriviSegnalazione(segnalazione) {
  if (!segnalazione) {
    return null;
  }
  const parti = [];
  const motivo = etichettaMotivo(segnalazione.motivo);
  if (motivo) {
    parti.push(motivo);
  }
  if (segnalazione.autore?.id !== null && segnalazione.segnalato?.id !== null) {
    parti.push(`${nomePersona(segnalazione.autore)} segnala ${nomePersona(segnalazione.segnalato)}`);
  }
  const riferimento = testoRiferimento(segnalazione.riferimento);
  if (riferimento) {
    parti.push(`riguarda ${riferimento}`);
  }
  return parti.length > 0 ? parti.join(' — ') : null;
}

/**
 * La frase di conferma della chiusura: dice **cosa sta per succedere**, perché
 * l'esito cambia la vita di due persone. «Sospendi Mario Rossi e assegna un token
 * a Te.» — `null` quando non c'è ancora niente da dire.
 */
export function descriviEsiti(esiti, { segnalato, beneficiario } = {}) {
  const scelti = Array.isArray(esiti) ? esiti : [];
  if (scelti.length === 0) {
    return null;
  }
  const nomeSegnalato = nomePersona(segnalato);
  const nomeBeneficiario = nomePersona(beneficiario);
  const frasi = scelti.map((esito) => {
    if (esito === ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO) {
      return 'non prendere provvedimenti';
    }
    if (esito === ESITI_CHIUSURA.UTENTE_SOSPESO) {
      return `sospendi ${nomeSegnalato}`;
    }
    if (esito === ESITI_CHIUSURA.UTENTE_BLOCCATO) {
      return `blocca ${nomeSegnalato}`;
    }
    if (esito === ESITI_CHIUSURA.TOKEN_ASSEGNATO) {
      return `assegna un token a ${nomeBeneficiario}`;
    }
    return esito;
  });
  const frase = frasi.join(' e ');
  return `${frase.charAt(0).toUpperCase()}${frase.slice(1)}.`;
}

/** L'etichetta di un esito, oppure il **valore grezzo** se non lo conosciamo. */
export function etichettaEsito(esito) {
  if (typeof esito !== 'string' || esito.trim() === '') {
    return null;
  }
  const chiave = esito.trim().toUpperCase();
  return ETICHETTE_ESITO[chiave] ?? chiave;
}

/** Le etichette degli esiti di una pratica chiusa, in una riga sola. */
export function descriviEsitiChiusi(esiti) {
  const scelti = Array.isArray(esiti) ? esiti : [];
  const etichette = scelti.map(etichettaEsito).filter(Boolean);
  return etichette.length > 0 ? etichette.join(', ') : null;
}

/** Il corpo di `azione:"prendi_in_carico"`. */
export function aPayloadPresaInCarico(id) {
  return { azione: 'prendi_in_carico', id };
}

/**
 * Il corpo di `azione:"chiudi"`, nella forma di rete proposta. `esiti` è una
 * **lista** per permettere le combinazioni; `id_beneficiario` c'è solo con
 * `TOKEN_ASSEGNATO` e una nota vuota si omette invece di spedire `""` (il backend
 * la salva come `NULL`), come per la descrizione della segnalazione.
 */
export function aPayloadChiusura(id, esiti, nota, idBeneficiario = null) {
  const payload = {
    azione: 'chiudi',
    id,
    esiti: Array.isArray(esiti) ? [...esiti] : [],
  };
  const testo = typeof nota === 'string' ? nota.trim() : '';
  if (testo !== '') {
    payload.nota = testo;
  }
  if (idBeneficiario !== null && idBeneficiario !== undefined) {
    payload.id_beneficiario = idBeneficiario;
  }
  return payload;
}

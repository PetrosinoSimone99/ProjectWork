/**
 * Logica pura degli accordi 1:1.
 *
 * Contratto di riferimento: `API/Accordi1_a_1/` (Parte 1 di
 * `docs/20-contratti-api/accordi.md`). Qui non si fanno chiamate di rete e non
 * c'è stato React: solo le regole con cui le schermate decidono *cosa mostrare*.
 * Nessuna schermata deve riscrivere queste decisioni per conto suo.
 *
 * Precondizione: l'accordo arriva normalizzato dal layer API
 * (`src/api/barattolo.js`), che aggiunge `io` e `altro`. Se la normalizzazione
 * non c'è, le funzioni ripiegano sui `partecipanti` grezzi.
 */

/** Crediti che il backend assegna a ogni partecipante al completamento. */
export const CREDITI_PER_ACCORDO = 10;

/** Etichette degli stati, in italiano come tutto il testo dell'app. */
export const ETICHETTE_STATO = {
  PROPOSTO: 'Proposto',
  ACCETTATO: 'Accettato',
  IN_ESECUZIONE: 'In esecuzione',
  COMPLETATO: 'Completato',
  ANNULLATO: 'Annullato',
  CONTESTATO: 'Contestato',
};

/**
 * Le azioni del ciclo di vita, come le vede l'utente.
 * `id` corrisponde alla funzione del layer API con lo stesso nome; `variante` è
 * la variante di `AppButton`; `conferma` è presente solo sulle azioni
 * distruttive, che passano da `ModalConferma`.
 */
export const AZIONI = {
  accetta: {
    id: 'accetta',
    etichetta: 'Accetta',
    variante: 'primary',
    icona: 'checkmark-circle-outline',
  },
  avvia: {
    id: 'avvia',
    etichetta: 'Avvia',
    variante: 'primary',
    icona: 'play-circle-outline',
  },
  completa: {
    id: 'completa',
    etichetta: 'Segna come completato',
    variante: 'primary',
    icona: 'checkmark-done-outline',
  },
  annulla: {
    id: 'annulla',
    etichetta: 'Annulla accordo',
    variante: 'danger',
    icona: 'close-circle-outline',
    conferma: {
      titolo: "Annullare l'accordo?",
      messaggio:
        "L'accordo viene chiuso e non può essere ripreso: per proseguire dovrete proporne uno nuovo.",
      etichettaConferma: 'Annulla accordo',
    },
  },
  contesta: {
    id: 'contesta',
    etichetta: 'Contesta',
    variante: 'danger',
    icona: 'alert-circle-outline',
    conferma: {
      titolo: "Contestare l'accordo?",
      messaggio:
        "L'accordo passa in stato contestato e non assegna crediti. Potete chiarire la situazione nella chat con l'altro partecipante.",
      etichettaConferma: 'Contesta',
    },
  },
};

/** I due ruoli restituiti da `risolviPartecipanti`. */
function risolviPartecipanti(accordo, utenteId) {
  const lista = Array.isArray(accordo?.partecipanti) ? accordo.partecipanti : [];
  const stessoUtente = (p) => Number(p?.id_utente) === Number(utenteId);
  return {
    io: accordo?.io ?? lista.find(stessoUtente) ?? null,
    altro: accordo?.altro ?? lista.find((p) => !stessoUtente(p)) ?? null,
  };
}

/** Il partecipante che sono io, o `null` se l'accordo non mi riguarda. */
export function mioRuolo(accordo, utenteId) {
  return risolviPartecipanti(accordo, utenteId).io;
}

/** L'altro partecipante, o `null` se l'accordo non mi riguarda. */
export function altroRuolo(accordo, utenteId) {
  return risolviPartecipanti(accordo, utenteId).altro;
}

/**
 * Le azioni che l'utente autenticato può eseguire su questo accordo, nello stato
 * in cui è. Non fa chiamate: è pura, quindi si legge e si verifica a occhio.
 *
 * Matrice (Parte 1 del contratto):
 * PROPOSTO  -> accetta (se non ho ancora accettato) + annulla
 * ACCETTATO -> avvia + annulla
 * IN_ESECUZIONE -> completa (se non ho ancora completato) + contesta
 * COMPLETATO / ANNULLATO / CONTESTATO -> nessuna: sola lettura
 */
export function azioniDisponibili(accordo, utenteId) {
  const { io, altro } = risolviPartecipanti(accordo, utenteId);
  if (!io || !altro) {
    // Accordo a cui non partecipo: nessuna azione, mai.
    return [];
  }
  switch (accordo?.stato) {
    case 'PROPOSTO':
      return [...(io.accettazione ? [] : [AZIONI.accetta]), AZIONI.annulla];
    case 'ACCETTATO':
      return [AZIONI.avvia, AZIONI.annulla];
    case 'IN_ESECUZIONE':
      return [...(io.completamento ? [] : [AZIONI.completa]), AZIONI.contesta];
    default:
      return [];
  }
}

/**
 * Tono del chip di stato: `info` (in attesa, nessuna fretta), `service` (pronto
 * a partire), `credit` (in esecuzione, i crediti sono in gioco), `success`
 * (concluso bene), `danger` (contestato).
 */
export function tonoStato(stato) {
  switch (stato) {
    case 'PROPOSTO':
    case 'ANNULLATO':
      return 'info';
    case 'ACCETTATO':
      return 'service';
    case 'IN_ESECUZIONE':
      return 'credit';
    case 'COMPLETATO':
      return 'success';
    case 'CONTESTATO':
      return 'danger';
    default:
      return 'info';
  }
}

/**
 * Vero quando la palla è dell'utente autenticato: alimenta il badge
 * «tocca a te» nell'elenco, che è il motivo per cui si apre la tab Accordi.
 */
export function toccaAMe(accordo, utenteId) {
  const { io, altro } = risolviPartecipanti(accordo, utenteId);
  if (!io || !altro) {
    return false;
  }
  if (accordo?.stato === 'PROPOSTO') {
    return io.accettazione !== true;
  }
  if (accordo?.stato === 'IN_ESECUZIONE') {
    return io.completamento !== true;
  }
  return false;
}

/** Vero quando lo stato prevede i crediti: si mostrano previsti o assegnati. */
export function mostraCrediti(stato) {
  return stato === 'IN_ESECUZIONE' || stato === 'COMPLETATO';
}

/**
 * Vero per gli stati che non si muovono più: servono a separare «in corso» da
 * «conclusi» nell'elenco, senza che la schermata conosca l'elenco degli stati.
 */
export function accordoConcluso(stato) {
  return stato === 'COMPLETATO' || stato === 'ANNULLATO' || stato === 'CONTESTATO';
}

/** Nome da mostrare per un partecipante, con ripieghi se il profilo è incompleto. */
export function nomePartecipante(partecipante) {
  if (!partecipante) {
    return 'Utente sconosciuto';
  }
  const nome = [partecipante.nome, partecipante.cognome].filter(Boolean).join(' ').trim();
  return nome || partecipante.username || 'Utente';
}

const MESI_BREVI = [
  'gen',
  'feb',
  'mar',
  'apr',
  'mag',
  'giu',
  'lug',
  'ago',
  'set',
  'ott',
  'nov',
  'dic',
];

/**
 * Durata in minuti -> "45 min", "1 h", "1 h 30 min".
 * Restituisce `null` per un valore assente o non valido: la UI lo nasconde
 * invece di mostrare "0 min" o "NaN".
 */
export function formattaDurata(minuti) {
  const valore = Number(minuti);
  if (!Number.isInteger(valore) || valore <= 0) {
    return null;
  }
  const ore = Math.floor(valore / 60);
  const resto = valore % 60;
  if (ore === 0) {
    return `${resto} min`;
  }
  return resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
}

/**
 * Data del backend ("2026-09-15 10:12:00") -> "15 set 2026, 10:12".
 * Senza librerie di date e senza dipendere dal locale del dispositivo, così la
 * stringa è sempre la stessa su web, Android e iOS.
 */
export function formattaData(valore) {
  if (typeof valore !== 'string') {
    return null;
  }
  const [parteData, parteOrario] = valore.split(' ');
  const [anno, mese, giorno] = (parteData ?? '').split('-').map(Number);
  if (!anno || !mese || !giorno || mese < 1 || mese > 12 || giorno < 1 || giorno > 31) {
    return null;
  }
  const giornoMeseAnno = `${giorno} ${MESI_BREVI[mese - 1]} ${anno}`;
  const orario = /^\d{2}:\d{2}/.test(parteOrario ?? '') ? parteOrario.slice(0, 5) : null;
  return orario ? `${giornoMeseAnno}, ${orario}` : giornoMeseAnno;
}

/**
 * Una frase che spiega lo stato corrente e cosa manca: è il testo più utile
 * della schermata di dettaglio, perché dice all'utente cosa sta aspettando.
 * Restituisce una stringa vuota quando non c'è nulla da spiegare.
 */
export function spiegaSituazione(accordo, utenteId) {
  const { io, altro } = risolviPartecipanti(accordo, utenteId);
  if (!io || !altro) {
    return 'Non risulti tra i partecipanti di questo accordo.';
  }
  const altroNome = nomePartecipante(altro);
  switch (accordo?.stato) {
    case 'PROPOSTO':
      if (io.accettazione && !altro.accettazione) {
        return `Hai accettato. In attesa dell'accettazione di ${altroNome}.`;
      }
      if (!io.accettazione && altro.accettazione) {
        return `${altroNome} ha accettato. Tocca a te accettare la proposta.`;
      }
      return `Nessuno dei due ha ancora accettato: l'accordo diventa operativo quando accettate entrambi.`;
    case 'ACCETTATO':
      return "Entrambi avete accettato. Avviate l'accordo quando iniziate l'attività.";
    case 'IN_ESECUZIONE':
      if (io.completamento && !altro.completamento) {
        return `Hai segnato il tuo completamento. In attesa che ${altroNome} completi il suo.`;
      }
      if (!io.completamento && altro.completamento) {
        return `${altroNome} ha completato la sua parte. Tocca a te.`;
      }
      return `L'accordo è in esecuzione: quando completate entrambi, ${CREDITI_PER_ACCORDO} crediti andranno a ciascuno.`;
    case 'COMPLETATO':
      return `Accordo completato: ${CREDITI_PER_ACCORDO} crediti a testa assegnati dal backend.`;
    case 'ANNULLATO':
      return "L'accordo è stato annullato e non è più riprendibile.";
    case 'CONTESTATO':
      return `Accordo contestato: i crediti non sono stati assegnati. Non ci sono azioni da fare qui: chiarite la situazione nella chat con ${altroNome}.`;
    default:
      return '';
  }
}

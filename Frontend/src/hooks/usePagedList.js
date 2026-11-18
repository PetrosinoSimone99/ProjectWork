import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';

/**
 * Una lista paginata dal server: la pagina 1 sostituisce, le altre si appendono.
 *
 * Le quattro liste dell'area staff (`/staff-users`, le segnalazioni, il registro
 * e i servizi eliminati) fanno la stessa cosa — chiedere una pagina, appendere
 * senza ripetere righe, ignorare una risposta arrivata dopo una richiesta più
 * recente, fermarsi quando `pagina >= pagineTotali` — e la terza copia di quelle
 * regole era la prima che si poteva sbagliare a mano. Qui vivono una volta sola
 * e con un test che le guarda.
 *
 * Tre dettagli che sembrano forma e non lo sono:
 *
 * 1. **Una richiesta superata non scrive niente** (`requestRef`): filtrare o
 *    ricaricare mentre un «Carica altri» è in volo non deve incollare la
 *    pagina vecchia sulla lista nuova.
 * 2. **La pagina si legge dal payload** (`paginazione.{pagina,pagineTotali}`),
 *    non da un contatore locale: `StaffController::pageResponse` manda il
 *    totale, quindi il backend è già la verità su quante pagine esistono.
 * 3. **`ricarica` ha identità stabile** (`carica` arriva da una ref): la
 *    schermata la mette dentro `useFocusEffect` e `useRefresh`, e un'identità
 *    che cambia a ogni pagina caricata riavvierebbe l'effetto in loop.
 *
 * `carica({ page, limit })` deve rispondere `{ righe, paginazione }`: la
 * schermata traduce il nome della collezione (`users`, `reports`, …) e il resto
 * lo fa questo hook.
 */

/** Quante righe per pagina quando il chiamante non lo dice (il backend si ferma a 50). */
export const DIMENSIONE_PAGINA = 20;

/** La chiave di una riga: `chiave` quando la riga ne ha una, altrimenti `id`. */
function chiavePredefinita(riga) {
  return riga?.chiave ?? riga?.id ?? null;
}

export function usePagedList({ carica, dimensione = DIMENSIONE_PAGINA, chiave = chiavePredefinita }) {
  const [voci, setVoci] = useState(null);
  const [paginazione, setPaginazione] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [caricamentoAltri, setCaricamentoAltri] = useState(false);
  const [errore, setErrore] = useState(null);
  const [erroreAltri, setErroreAltri] = useState(null);

  const requestRef = useRef(0);
  const vivoRef = useRef(true);
  // Letta dentro le callback stabili, aggiornata dopo il render: scrivere una
  // ref nel corpo del componente è quello che `react-hooks/refs` vieta.
  const caricaRef = useRef(carica);
  const dimensioneRef = useRef(dimensione);
  const chiaveRef = useRef(chiave);
  const paginazioneRef = useRef(null);
  // Quante richieste sono in volo: il contatore e non un booleano, perché una
  // ricarica può partire mentre un appendente è ancora aperto e la fine della
  // prima non deve far credere che non ci sia più niente in corso.
  const inVoloRef = useRef(0);

  useEffect(() => {
    caricaRef.current = carica;
    dimensioneRef.current = dimensione;
    chiaveRef.current = chiave;
  });

  useEffect(
    () => () => {
      vivoRef.current = false;
      // Le risposte ancora in volo non devono scrivere su un componente smontato.
      requestRef.current += 1;
    },
    [],
  );

  const leggi = useCallback(async (pagina, inCoda) => {
    const seq = ++requestRef.current;
    inVoloRef.current += 1;
    if (inCoda) {
      setCaricamentoAltri(true);
      setErroreAltri(null);
    } else {
      setCaricamento(true);
      // Una pagina nuova rende vecchio anche l'errore dell'appendente.
      setErrore(null);
      setErroreAltri(null);
    }
    try {
      const risultato = await caricaRef.current({
        page: pagina,
        limit: dimensioneRef.current,
      });
      if (!vivoRef.current || seq !== requestRef.current) {
        return;
      }
      const righe = Array.isArray(risultato?.righe) ? risultato.righe : [];
      const nuovaPaginazione = risultato?.paginazione ?? null;
      setVoci((precedenti) => {
        if (!inCoda || precedenti === null) {
          return righe;
        }
        // La paginazione è a offset su una lista che può cambiare (una
        // chiusura sposta la finestra): una riga già letta non si ripete.
        const viste = new Set(precedenti.map((riga) => chiaveRef.current(riga)));
        return [...precedenti, ...righe.filter((riga) => !viste.has(chiaveRef.current(riga)))];
      });
      setPaginazione(nuovaPaginazione);
      paginazioneRef.current = nuovaPaginazione;
    } catch (err) {
      if (!vivoRef.current || seq !== requestRef.current) {
        return;
      }
      const messaggio = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      if (inCoda) {
        setErroreAltri(messaggio);
      } else {
        setErrore(messaggio);
      }
    } finally {
      inVoloRef.current = Math.max(0, inVoloRef.current - 1);
      if (vivoRef.current && seq === requestRef.current) {
        setCaricamento(false);
        setCaricamentoAltri(false);
      }
    }
  }, []);

  /** La pagina 1: sostituisce quello che è a schermo (ricarica, filtro nuovo). */
  const ricarica = useCallback(() => leggi(1, false), [leggi]);

  /**
   * La pagina dopo, appesa. Si ferma da sola quando non ce ne sono altre o
   * quando una richiesta è già in volo: il bottone può essere premuto due volte.
   */
  const caricaAltri = useCallback(() => {
    const corrente = paginazioneRef.current;
    const pagina = corrente?.pagina ?? null;
    const pagineTotali = corrente?.pagineTotali ?? null;
    if (inVoloRef.current > 0) {
      return undefined;
    }
    if (pagina === null || pagineTotali === null || pagina >= pagineTotali) {
      return undefined;
    }
    return leggi(pagina + 1, true);
  }, [leggi]);

  const haAltre =
    paginazione?.pagina !== null &&
    paginazione?.pagina !== undefined &&
    paginazione?.pagineTotali !== null &&
    paginazione?.pagineTotali !== undefined &&
    paginazione.pagina < paginazione.pagineTotali;

  return {
    voci,
    paginazione,
    caricamento,
    caricamentoAltri,
    errore,
    erroreAltri,
    ricarica,
    caricaAltri,
    haAltre,
  };
}

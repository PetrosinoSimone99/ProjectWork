import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, GENERIC_ERROR_MESSAGE, isEndpointUnavailable } from '@/api/client';

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
 * 4. **Il ritorno sulla schermata passa da `aggiornaAlFocus`**, che non
 *    ripete una pagina fresca e non riporta a pagina 1 una lista con pagine
 *    già incollate: `ricarica` resta il comando manuale e ignora la finestra.
 * 5. **`caricamento` descrive la prima pagina, `aggiornamento` la rilettura in
 *    secondo piano**: le righe a schermo non spariscono mentre si rileggono.
 *
 * `carica({ page, limit })` deve rispondere `{ righe, paginazione }`: la
 * schermata traduce il nome della collezione (`users`, `reports`, …) e il resto
 * lo fa questo hook.
 */

/** Quante righe per pagina quando il chiamante non lo dice (il backend si ferma a 50). */
const DIMENSIONE_PAGINA = 20;

/**
 * Per quanto una pagina appena letta vale come «fresca».
 *
 * Il backend è la velocità percepita del prodotto (audit P2: mediana 4,01 s per
 * chiamata): il ritorno su una schermata staff non deve ripagarla ogni volta.
 * Dentro questa finestra `aggiornaAlFocus` si salta; `ricarica` — il comando
 * manuale, il «Riprova», il pull-to-refresh — chiede sempre.
 */
export const FINESTRA_FRESCHEZZA_MS = 30000;

/** La chiave di una riga: `chiave` quando la riga ne ha una, altrimenti `id`. */
function chiavePredefinita(riga) {
  return riga?.chiave ?? riga?.id ?? null;
}

export function usePagedList({ carica, dimensione = DIMENSIONE_PAGINA, chiave = chiavePredefinita }) {
  const [voci, setVoci] = useState(null);
  const [paginazione, setPaginazione] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [aggiornamento, setAggiornamento] = useState(false);
  const [caricamentoAltri, setCaricamentoAltri] = useState(false);
  const [errore, setErrore] = useState(null);
  const [erroreAltri, setErroreAltri] = useState(null);
  // Un endpoint che non esiste (404/501) non è un guasto: la schermata che lo
  // legge ha uno stato suo, più onesto di «errore, riprova». La regola è una
  // sola (`isEndpointUnavailable`) e questo hook la riporta come booleano
  // perché la schermata riceve il messaggio già in italiano, non l'eccezione.
  const [erroreNonDisponibile, setErroreNonDisponibile] = useState(false);
  // `true` quando la finestra a schermo è quella che il backend ha appena
  // descritto **per la richiesta corrente**. Serve al bottone «Carica altri»:
  // dopo una ricarica fallita, o durante i 350 ms in cui la ricerca è cambiata
  // e la pagina 1 non è ancora partita, la paginazione in memoria descrive una
  // finestra che non è più quella a schermo, e appendere la pagina dopo
  // mescolerebbe due insiemi diversi (un P1 trovato in review).
  const [finestraPronta, setFinestraPronta] = useState(false);

  const requestRef = useRef(0);
  const vivoRef = useRef(true);
  // Letta dentro le callback stabili, aggiornata dopo il render: scrivere una
  // ref nel corpo del componente è quello che `react-hooks/refs` vieta.
  const caricaRef = useRef(carica);
  const dimensioneRef = useRef(dimensione);
  const chiaveRef = useRef(chiave);
  const paginazioneRef = useRef(null);
  const finestraProntaRef = useRef(false);
  // La `carica` che ha prodotto la pagina 1 a schermo: se nel frattempo cambia
  // (ricerca, stato, filtro), la finestra è vecchia anche se le righe no.
  const finestraCaricaRef = useRef(carica);
  // Quante richieste sono in volo: il contatore e non un booleano, perché una
  // ricarica può partire mentre un appendente è ancora aperto e la fine della
  // prima non deve far credere che non ci sia più niente in corso.
  const inVoloRef = useRef(0);
  // Se una pagina è mai stata applicata, e quando: decidono se il ritorno sulla
  // schermata può saltare la chiamata. Mai resi nello stato: un timestamp
  // renderizzato cambierebbe a ogni risposta e riavvierebbe l'effetto in loop.
  const haDatiRef = useRef(false);
  const ultimaLetturaRef = useRef(0);

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

  const leggi = useCallback(async (pagina, inCoda, inSfondo = false) => {
    const seq = ++requestRef.current;
    inVoloRef.current += 1;
    if (inCoda) {
      setCaricamentoAltri(true);
      setErroreAltri(null);
    } else {
      // La rilettura in secondo piano tiene le righe a schermo e vive in
      // `aggiornamento`: nessuno svuota la lista per un ritorno sulla schermata.
      if (inSfondo) {
        setAggiornamento(true);
      } else {
        setCaricamento(true);
      }
      // Una pagina nuova rende vecchio anche l'errore dell'appendente, e la
      // finestra a schermo non è più quella che stiamo per ricevere: finché la
      // risposta non arriva, «Carica altri» non deve poter partire.
      setErrore(null);
      setErroreAltri(null);
      setErroreNonDisponibile(false);
      setFinestraPronta(false);
      finestraProntaRef.current = false;
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
      haDatiRef.current = true;
      ultimaLetturaRef.current = Date.now();
      if (!inCoda) {
        // Solo una pagina 1 appena arrivata descrive la finestra a schermo.
        setFinestraPronta(true);
        finestraProntaRef.current = true;
        finestraCaricaRef.current = caricaRef.current;
      }
    } catch (err) {
      if (!vivoRef.current || seq !== requestRef.current) {
        return;
      }
      const messaggio = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
      if (inCoda) {
        setErroreAltri(messaggio);
      } else {
        setErrore(messaggio);
        setErroreNonDisponibile(isEndpointUnavailable(err));
      }
    } finally {
      inVoloRef.current = Math.max(0, inVoloRef.current - 1);
      if (vivoRef.current && seq === requestRef.current) {
        setCaricamento(false);
        setAggiornamento(false);
        setCaricamentoAltri(false);
      }
    }
  }, []);

  /** La pagina 1: sostituisce quello che è a schermo (ricarica, filtro nuovo). */
  const ricarica = useCallback(() => leggi(1, false), [leggi]);

  /**
   * Se il ritorno sulla schermata può tenere quello che c'è già.
   *
   * Si tiene quando una pagina è già a schermo e **o** la finestra è stata
   * allargata con «Carica altri» — tornare a pagina 1 butterebbe via quello che
   * l'utente ha caricato — **o** la pagina è stata letta da meno di
   * `FINESTRA_FRESCHEZZA_MS`. Legge solo ref, quindi non dipende da niente che
   * cambi a ogni render.
   */
  const puoTenereLaLista = useCallback(() => {
    if (!haDatiRef.current) {
      return false;
    }
    if ((paginazioneRef.current?.pagina ?? 1) > 1) {
      return true;
    }
    return Date.now() - ultimaLetturaRef.current < FINESTRA_FRESCHEZZA_MS;
  }, []);

  /**
   * Il ritorno sulla schermata: chiede la pagina 1 solo se la copia a schermo
   * non può restare, e in secondo piano (le righe restano, `aggiornamento` dice
   * che si sta rileggendo). `ricarica` resta il comando manuale e chiede sempre:
   * un «Riprova» non deve poter essere saltato da una finestra.
   */
  const aggiornaAlFocus = useCallback(() => {
    if (puoTenereLaLista()) {
      return undefined;
    }
    return leggi(1, false, true);
  }, [leggi, puoTenereLaLista]);

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
    // La finestra in memoria non è quella a schermo: appendere salterebbe le
    // pagine intermedie dell'insieme nuovo. Meglio non fare niente: la ricarica
    // della pagina 1 è già in arrivo (cambio ricerca, stato o filtro).
    if (!finestraProntaRef.current || finestraCaricaRef.current !== caricaRef.current) {
      return undefined;
    }
    if (pagina === null || pagineTotali === null || pagina >= pagineTotali) {
      return undefined;
    }
    return leggi(pagina + 1, true);
  }, [leggi]);

  const haAltre =
    finestraPronta &&
    paginazione?.pagina !== null &&
    paginazione?.pagina !== undefined &&
    paginazione?.pagineTotali !== null &&
    paginazione?.pagineTotali !== undefined &&
    paginazione.pagina < paginazione.pagineTotali;

  return {
    voci,
    paginazione,
    caricamento,
    aggiornamento,
    caricamentoAltri,
    errore,
    erroreAltri,
    erroreNonDisponibile,
    ricarica,
    aggiornaAlFocus,
    caricaAltri,
    haAltre,
  };
}

import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { cancelAgreement, listAgreements, respondToAgreement } from '@/api';
import { affectsAgreements } from '@/api/stream';
import { classifyAgreements } from '@/services/agreements';
import { useRefresh } from '@/hooks/useRefresh';
import { useStreamEvent } from '@/hooks/useEventStream';

/** Copy when an action starts without the session or a valid id. */
const ACTION_UNAVAILABLE = 'Operazione non disponibile: ricarica la schermata e riprova.';

/**
 * What the screen says after an action that worked.
 *
 * Accettare, rifiutare e annullare finiscono con la lista ricaricata e niente
 * altro: la riga sparisce e l'utente deve dedurre che cosa è successo (audit UX
 * F43). Ogni verbo ha la sua frase, e la frase nomina l'esito, non il gesto.
 */
const ESITI = {
  accetta: 'Proposta accettata: lo scambio ora è in «In corso».',
  rifiuta: 'Proposta rifiutata.',
  annulla: 'Scambio annullato.',
};

/**
 * How long a list read counts as fresh.
 *
 * The backend is the product's perceived speed (audit P2: 4.01 s median per
 * call), so returning to the tab must not re-pay it every time. Inside this
 * window the focus refetch is skipped — but only when the stream has already
 * spoken (see `letturaFresca`): without that proof the refetch is the only
 * path to a current list and stays.
 */
export const FINESTRA_FRESCHEZZA_MS = 30000;

/**
 * The data layer of the agreements tab: list, classification, the two
 * actions and their states, following the `useServiceCatalog` pattern.
 *
 * Five things that look like details and are not:
 *
 * 1. **Out-of-order responses never overwrite newer ones** (`requestSeqRef`):
 *    a list response applies only if no newer request has started, and
 *    leaving the tab invalidates the response in flight.
 * 2. **The tab reloads when a stream frame says the agreements changed** —
 *    the frame is «rileggi», never a payload to draw. A failed reload keeps the
 *    agreements already on screen: the Banner says why instead of blanking a
 *    screen that had data a second ago.
 * 3. **Returning to the foreground is a fallback, not the only path** (D029):
 *    the list is re-read on focus unless what is on screen was read less than
 *    `FINESTRA_FRESCHEZZA_MS` ago **and** the stream has already handed over a
 *    frame, which is what makes the copy on screen the stream's own copy.
 *    Without a frame the refetch always runs, because a silent stream is not
 *    evidence of anything. `riprova` and the pull-to-refresh ignore the rule:
 *    a manual request is always a request.
 * 4. **`caricamento` is the first load only**: while rows are already on screen
 *    a re-read raises `aggiornamento`, so no screen blanks its list to a
 *    spinner and every screen can still tell the two waits apart.
 * 5. **Actions run one call and then reload the list** (`rispondi`,
 *    `annulla`), so every section shows the new state without a manual
 *    refresh. A failure lands in `actionError`, never in silence.
 * 6. **`azioneInCorso` names the busy agreement** (`{id, nome}` with
 *    `nome` in `accetta`/`rifiuta`/`annulla`): the screen disables the other
 *    controls while an action flies, so two actions cannot clobber each
 *    other's busy state.
 * 7. **`classificati` is `null` until the first response arrives**, the same
 *    as `accordi`: the screen can tell "still loading" from "loaded and
 *    empty" and never draws an invented count.
 */
export function useAgreements({ token, myUsername }) {
  const [accordi, setAccordi] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [aggiornamento, setAggiornamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [esito, setEsito] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(null);

  // Incremented on every list request and on blur: a response that arrives
  // after a newer request (or after leaving the tab) is stale and ignored.
  const requestSeqRef = useRef(0);

  // Whether a list has ever been applied: it decides between `caricamento`
  // (nothing on screen) and `aggiornamento` (a re-read behind existing rows).
  const haDatiRef = useRef(false);

  // When the last list was applied, and whether the stream has handed over a
  // frame in this mount. Both are read by the focus effect and never rendered:
  // a timestamp in state would re-render on every read and re-run the effect.
  const ultimaLetturaRef = useRef(0);
  const streamVivoRef = useRef(false);

  const esegui = useCallback(async () => {
    if (!token) {
      return;
    }
    const seq = ++requestSeqRef.current;
    // With rows on screen this read is a refresh, not a first load: the list
    // stays where it is and the wait is reported by the other flag.
    if (haDatiRef.current) {
      setAggiornamento(true);
    } else {
      setCaricamento(true);
    }
    setErrore(null);
    setActionError(null);
    try {
      const elenco = await listAgreements(token);
      if (seq !== requestSeqRef.current) {
        return; // superseded request: the response is stale, the UI keeps what it has.
      }
      setAccordi(elenco);
      haDatiRef.current = true;
      ultimaLetturaRef.current = Date.now();
    } catch (err) {
      if (seq !== requestSeqRef.current) {
        return;
      }
      setErrore(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      if (seq === requestSeqRef.current) {
        setCaricamento(false);
        setAggiornamento(false);
      }
    }
  }, [token]);

  /**
   * Whether returning to the tab can keep what is on screen.
   *
   * Two conditions, and both are needed: a read inside the freshness window, and
   * a stream frame already handled since this mount — the frame is what proves
   * the stream is the live path for this tab, so the copy on screen is its own
   * copy and the 4 s call would buy nothing. Never reads a value that changes
   * per render: a timestamp in state would re-run the focus effect in a loop.
   */
  const letturaFresca = useCallback(() => {
    if (!haDatiRef.current || !streamVivoRef.current) {
      return false;
    }
    return Date.now() - ultimaLetturaRef.current < FINESTRA_FRESCHEZZA_MS;
  }, []);

  /** Blur: the response in flight must not land, and no wait flag survives. */
  const lasciaLaTab = useCallback(() => {
    // The stale response is dropped by the sequence bump, but its `finally` will
    // not run the flag reset (the sequence no longer matches), so both waits
    // have to be switched off here.
    requestSeqRef.current += 1;
    setCaricamento(false);
    setAggiornamento(false);
  }, []);

  // Reload on focus of the tab, unless the stream already keeps it current.
  useFocusEffect(
    useCallback(() => {
      if (!letturaFresca()) {
        void esegui();
      }
      return lasciaLaTab;
    }, [esegui, letturaFresca, lasciaLaTab]),
  );

  // A proposal, an answer, a cancellation or a completion lands as a frame that
  // only names the event: the row the screen shows comes from the list, so the
  // list is re-read. Without a token `esegui` returns at once and nothing opens.
  useStreamEvent(
    useCallback(
      (notifica) => {
        if (!affectsAgreements(notifica)) {
          return;
        }
        // A handled frame is the proof `letturaFresca` needs: from here on the
        // list on screen is the stream's own copy, not a screenshot.
        streamVivoRef.current = true;
        void esegui();
      },
      [esegui],
    ),
  );

  /** One action: single busy slot, own error, then a reload of the list. */
  const eseguiAzione = useCallback(
    async (id, nome, call) => {
      if (!token || !Number.isInteger(id)) {
        setActionError(ACTION_UNAVAILABLE);
        return;
      }
      setActionError(null);
      setEsito(null);
      setAzioneInCorso({ id, nome });
      try {
        await call();
        setEsito(ESITI[nome] ?? null);
        await esegui();
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setAzioneInCorso(null);
      }
    },
    [token, esegui],
  );

  /** POST /send-agreement-response: `accepted` true accepts, false refuses. */
  const rispondi = useCallback(
    (id, accepted) => {
      const confermato = accepted === true;
      return eseguiAzione(id, confermato ? 'accetta' : 'rifiuta', () =>
        respondToAgreement(token, id, confermato),
      );
    },
    [eseguiAzione, token],
  );

  /** POST /cancel-agreement/{id}: an accepted exchange becomes void. */
  const annulla = useCallback(
    (id) => eseguiAzione(id, 'annulla', () => cancelAgreement(token, id)),
    [eseguiAzione, token],
  );

  /** «Riprova»: repeats the list request that failed, nothing else. */
  const riprova = useCallback(() => {
    setEsito(null);
    void esegui();
  }, [esegui]);

  /** The user has read the outcome: the confirmation goes away. */
  const congedaEsito = useCallback(() => setEsito(null), []);

  // Null until the first response: loading and "loaded but empty" stay apart.
  const classificati = useMemo(
    () => (accordi === null ? null : classifyAgreements(accordi, myUsername)),
    [accordi, myUsername],
  );

  // Pull-to-refresh: repeats the list request without dropping the context.
  const aggiorna = useCallback(() => esegui(), [esegui]);
  const { refreshing, onRefresh } = useRefresh(aggiorna);

  return {
    accordi,
    classificati,
    caricamento,
    aggiornamento,
    errore,
    rispondi,
    annulla,
    actionError,
    esito,
    congedaEsito,
    azioneInCorso,
    refreshing,
    onRefresh,
    riprova,
  };
}

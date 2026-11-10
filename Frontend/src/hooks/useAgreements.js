import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { cancelAgreement, listAgreements, respondToAgreement } from '@/api';
import { classifyAgreements } from '@/services/agreements';
import { useRefresh } from '@/hooks/useRefresh';

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
 * The data layer of the agreements tab: list, classification, the two
 * actions and their states, following the `useServiceCatalog` pattern.
 *
 * Five things that look like details and are not:
 *
 * 1. **Out-of-order responses never overwrite newer ones** (`requestSeqRef`):
 *    a list response applies only if no newer request has started, and
 *    leaving the tab invalidates the response in flight.
 * 2. **The tab reloads when it returns to the foreground**; a failed reload
 *    keeps the agreements already on screen — the Banner says why instead of
 *    blanking a screen that had data a second ago.
 * 3. **Actions run one call and then reload the list** (`rispondi`,
 *    `annulla`), so every section shows the new state without a manual
 *    refresh. A failure lands in `actionError`, never in silence.
 * 4. **`azioneInCorso` names the busy agreement** (`{id, nome}` with
 *    `nome` in `accetta`/`rifiuta`/`annulla`): the screen disables the other
 *    controls while an action flies, so two actions cannot clobber each
 *    other's busy state.
 * 5. **`classificati` is `null` until the first response arrives**, the same
 *    as `accordi`: the screen can tell "still loading" from "loaded and
 *    empty" and never draws an invented count.
 */
export function useAgreements({ token, myUsername }) {
  const [accordi, setAccordi] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [esito, setEsito] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(null);

  // Incremented on every list request and on blur: a response that arrives
  // after a newer request (or after leaving the tab) is stale and ignored.
  const requestSeqRef = useRef(0);

  const esegui = useCallback(async () => {
    if (!token) {
      return;
    }
    const seq = ++requestSeqRef.current;
    setCaricamento(true);
    setErrore(null);
    setActionError(null);
    try {
      const elenco = await listAgreements(token);
      if (seq !== requestSeqRef.current) {
        return; // superseded request: the response is stale, the UI keeps what it has.
      }
      setAccordi(elenco);
    } catch (err) {
      if (seq !== requestSeqRef.current) {
        return;
      }
      setErrore(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      if (seq === requestSeqRef.current) {
        setCaricamento(false);
      }
    }
  }, [token]);

  // Reload on every focus of the tab; blurring cancels the response in flight.
  useFocusEffect(
    useCallback(() => {
      void esegui();
      return () => {
        // The stale response is dropped by the sequence bump, but its `finally`
        // will not run the flag reset (the sequence no longer matches), so the
        // spinner has to be switched off here.
        requestSeqRef.current += 1;
        setCaricamento(false);
      };
    }, [esegui]),
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

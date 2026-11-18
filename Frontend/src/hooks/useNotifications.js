import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import {
  deleteNotification,
  getNotifications,
  markNotificationRead,
} from '@/api/areas/notifications';

/**
 * How many pages the inbox collects before it stops.
 *
 * `pagination.totalPages` is the real total (`backend-gaps.md` G16 was retracted:
 * the controller counts the whole filtered query), so the hook reads every page
 * of the inbox and not just the first. The cap exists because «every page» is an
 * unbounded number of requests for an account with a thousand notifications: at
 * `NOTIFICATIONS_PAGE_SIZE` rows per page this is 100 rows, and beyond it the
 * badge can stay above zero after a close — a declared limit, not a local
 * counter that would drift from the server's.
 */
export const NOTIFICATIONS_MAX_PAGES = 5;

/**
 * The data layer of the notifications inbox.
 *
 * The backend has no push channel: this hook asks again when the screen comes
 * back to the foreground and when the user pulls (the screen wires the pull into
 * `ricarica`), and reads the unread count from the same answer instead of
 * keeping a counter of its own (a counter would be a second truth, and the
 * notification that arrived from another device would never reach it).
 *
 * It asks for **every page** of the inbox, up to `NOTIFICATIONS_MAX_PAGES`:
 * `pagination.totalPages` is the real total (G16 in `docs/backend-gaps.md`,
 * which claimed the count was page-scoped, was retracted on 2026-11-18), and the
 * pages are accumulated so that closing the panel marks every row the panel
 * actually holds — with page 1 alone, twenty-one unread notifications would
 * leave the badge above zero forever.
 *
 * Reads follow the `useAgreements` pattern:
 *
 * 1. **A stale response never overwrites a newer one** (`requestSeqRef`): the
 *    response applies only if no newer request has started, and leaving the
 *    screen invalidates the one in flight.
 * 2. **A failed reload keeps what is on screen** and says why through `errore`:
 *    blanking a list that had rows a second ago is worse than a banner.
 * 3. **`elementi` is `null` until the first answer**, so the screen tells
 *    "still loading" from "loaded and empty" and never draws an invented count.
 * 4. **One action at a time** (`azioneInCorso` names the row), so two taps
 *    cannot clobber each other's busy state. That holds for `elimina`;
 *    reading is not a turn in that slot either, because it is not a command:
 *    it happens when the panel **closes**. The rows the panel showed mark
 *    themselves read then — the backend has no bulk read, so it is one `PATCH`
 *    per row, and a failed `PATCH` leaves the row unread with a warning that
 *    only a developer can read. Nothing marks anything while the panel is open:
 *    that is what keeps «Non letta» readable for the person looking at it.
 */
export function useNotifications({ token }) {
  const [elementi, setElementi] = useState(null);
  const [nonLette, setNonLette] = useState(0);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(null);

  const requestSeqRef = useRef(0);

  const carica = useCallback(async () => {
    if (!token) {
      return;
    }
    const seq = ++requestSeqRef.current;
    setCaricamento(true);
    setErrore(null);
    // Rows already collected by the pages that answered: a page that fails
    // keeps them on screen, which is the same promise point 2 makes for a
    // reload.
    const raccolte = [];
    let conteggio = 0;
    try {
      let pagina = 1;
      let pagineTotali = 1;
      do {
        const risposta = await getNotifications(token, { page: pagina });
        if (seq !== requestSeqRef.current) {
          return;
        }
        if (pagina === 1) {
          // The unread count is global, not page-scoped: one read is enough.
          conteggio = risposta.nonLette;
        }
        raccolte.push(...risposta.elementi);
        pagineTotali = risposta.paginazione?.pagineTotali ?? 1;
        pagina += 1;
      } while (pagina <= Math.min(pagineTotali, NOTIFICATIONS_MAX_PAGES));
      setNonLette(conteggio);
      setElementi(raccolte);
    } catch (err) {
      if (seq !== requestSeqRef.current) {
        return;
      }
      if (raccolte.length > 0) {
        setNonLette(conteggio);
        setElementi(raccolte);
      }
      setErrore(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      if (seq === requestSeqRef.current) {
        setCaricamento(false);
      }
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void carica();
      return () => {
        requestSeqRef.current += 1;
      };
    }, [carica]),
  );

  const elimina = useCallback(
    async (id) => {
      if (!token || azioneInCorso !== null) {
        return;
      }
      setAzioneInCorso({ id, nome: 'elimina' });
      setErrore(null);
      try {
        await deleteNotification(token, id);
        setElementi((precedenti) => (precedenti ?? []).filter((riga) => riga.id !== id));
        setNonLette((conteggio) => {
          const riga = (elementi ?? []).find((notifica) => notifica.id === id);
          return riga && !riga.letta ? Math.max(conteggio - 1, 0) : conteggio;
        });
      } catch (err) {
        setErrore(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setAzioneInCorso(null);
      }
    },
    [azioneInCorso, elementi, token],
  );

  const segnaLetteMostrate = useCallback(async () => {
    if (!token) {
      return;
    }
    const daSegnare = (elementi ?? []).filter((notifica) => !notifica.letta);
    if (daSegnare.length === 0) {
      return;
    }
    const esiti = await Promise.allSettled(
      daSegnare.map((notifica) => markNotificationRead(token, notifica.id)),
    );
    const aggiornate = new Map();
    esiti.forEach((esito) => {
      if (esito.status === 'fulfilled') {
        if (esito.value !== null) {
          aggiornate.set(esito.value.id, esito.value);
        }
        return;
      }
      logInSviluppo(
        '[notifiche] lettura automatica non riuscita',
        esito.reason?.message ?? esito.reason,
      );
    });
    if (aggiornate.size === 0) {
      return;
    }
    setElementi((precedenti) =>
      (precedenti ?? []).map((riga) => aggiornate.get(riga.id) ?? riga),
    );
    setNonLette((conteggio) => Math.max(conteggio - aggiornate.size, 0));
  }, [elementi, token]);

  return {
    elementi,
    nonLette,
    caricamento,
    errore,
    azioneInCorso,
    ricarica: carica,
    segnaLetteMostrate,
    elimina,
  };
}

/** How often the profile badge asks again. */
export const UNREAD_POLL_MS = 30000;

/** `console.warn` only where a developer can read it. */
function logInSviluppo(messaggio, dettaglio) {
  if (typeof __DEV__ === 'undefined' || __DEV__) {
    console.warn(messaggio, dettaglio);
  }
}

/**
 * The unread count alone, for the profile row that opens the inbox.
 *
 * It asks for one row (`limit: 1`) instead of the page: the profile needs the
 * number, not the list, and a full page would be twenty rows the screen throws
 * away.
 *
 * It asks again every `UNREAD_POLL_MS` while the screen is focused, so a
 * notification that arrived from another device moves the row without the user
 * touching anything. The timer lives inside `useFocusEffect` (leaving the tab
 * clears it) and a tick does nothing while `AppState` is not `'active'`, so a
 * backgrounded app sends no request; coming back to the foreground reads at
 * once instead of waiting a whole interval. The inbox is not covered here — it
 * uses `useNotifications`, which reads on focus.
 *
 * The count still comes from the response, never from a local counter: a
 * counter would be a second truth, and a notification that arrived from another
 * device would never reach it.
 *
 * A failure leaves the row neutral (`null`, not `0`) and warns in development
 * through `logInSviluppo` — no banner on the profile, the inbox itself reports
 * the error when it opens.
 *
 * `ricarica` exists because the profile's pull-to-refresh must move this number
 * too: a gesture that refreshes the profile and leaves the badge at the old
 * value is a gesture that looks broken.
 */
export function useUnreadCount({ token }) {
  const [nonLette, setNonLette] = useState(null);
  const richiestaRef = useRef(0);

  const carica = useCallback(async () => {
    if (!token) {
      return;
    }
    const seq = ++richiestaRef.current;
    try {
      const risposta = await getNotifications(token, { limit: 1 });
      if (seq === richiestaRef.current) {
        setNonLette(risposta.nonLette);
      }
    } catch (err) {
      if (seq === richiestaRef.current) {
        setNonLette(null);
        logInSviluppo('[notifiche] conteggio non lette non riuscito', err?.message ?? err);
      }
    }
  }, [token]);

  /** One poll tick: nothing to ask while the app is in the background. */
  const sonda = useCallback(() => {
    if (AppState.currentState !== 'active') {
      return;
    }
    void carica();
  }, [carica]);

  useFocusEffect(
    useCallback(() => {
      void carica();
      return () => {
        richiestaRef.current += 1;
      };
    }, [carica]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return undefined;
      }
      const timer = setInterval(() => {
        void sonda();
      }, UNREAD_POLL_MS);
      return () => clearInterval(timer);
    }, [token, sonda]),
  );

  useFocusEffect(
    useCallback(() => {
      const sottoscrizione = AppState.addEventListener('change', (stato) => {
        if (stato === 'active') {
          void carica();
        }
      });
      return () => sottoscrizione.remove();
    }, [carica]),
  );

  return { nonLette, ricarica: carica };
}

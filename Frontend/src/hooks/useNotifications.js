import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import {
  deleteNotification,
  getNotifications,
  markNotificationRead,
} from '@/api/areas/notifications';

/**
 * The data layer of the notifications inbox.
 *
 * The backend has no push channel: this hook asks again when the screen comes
 * back to the foreground and when the user pulls, and reads the unread count
 * from the same answer instead of keeping a counter of its own (a counter would
 * be a second truth, and the notification that arrived from another device
 * would never reach it).
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
 *    cannot clobber each other's busy state.
 */
export function useNotifications({ token }) {
  const [elementi, setElementi] = useState(null);
  const [nonLette, setNonLette] = useState(0);
  const [paginazione, setPaginazione] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [caricandoAltre, setCaricandoAltre] = useState(false);
  const [errore, setErrore] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(null);

  const requestSeqRef = useRef(0);

  const carica = useCallback(
    async (page = 1) => {
      if (!token) {
        return;
      }
      const seq = ++requestSeqRef.current;
      const prime = page === 1;
      if (prime) {
        setCaricamento(true);
      } else {
        setCaricandoAltre(true);
      }
      setErrore(null);
      try {
        const risposta = await getNotifications(token, { page });
        if (seq !== requestSeqRef.current) {
          return;
        }
        setNonLette(risposta.nonLette);
        setPaginazione(risposta.paginazione);
        setElementi((precedenti) =>
          prime || precedenti === null ? risposta.elementi : [...precedenti, ...risposta.elementi],
        );
      } catch (err) {
        if (seq !== requestSeqRef.current) {
          return;
        }
        setErrore(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      } finally {
        if (seq === requestSeqRef.current) {
          setCaricamento(false);
          setCaricandoAltre(false);
        }
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      void carica(1);
      return () => {
        requestSeqRef.current += 1;
      };
    }, [carica]),
  );

  /** The next page, only when the backend says there is one. */
  const caricaAltre = useCallback(() => {
    if (caricandoAltre || caricamento || !paginazione) {
      return;
    }
    const pagina = paginazione.pagina ?? 1;
    const totali = paginazione.pagineTotali ?? 0;
    if (pagina >= totali) {
      return;
    }
    void carica(pagina + 1);
  }, [carica, caricamento, caricandoAltre, paginazione]);

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

  const segnaLetta = useCallback(
    async (id) => {
      if (!token || azioneInCorso !== null) {
        return;
      }
      setAzioneInCorso({ id, nome: 'letta' });
      setErrore(null);
      try {
        const aggiornata = await markNotificationRead(token, id);
        if (aggiornata !== null) {
          setElementi((precedenti) =>
            (precedenti ?? []).map((riga) => (riga.id === id ? aggiornata : riga)),
          );
          setNonLette((conteggio) => Math.max(conteggio - 1, 0));
        }
      } catch (err) {
        setErrore(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setAzioneInCorso(null);
      }
    },
    [azioneInCorso, token],
  );

  return {
    elementi,
    nonLette,
    paginazione,
    caricamento,
    caricandoAltre,
    errore,
    azioneInCorso,
    ricarica: () => carica(1),
    caricaAltre,
    segnaLetta,
    elimina,
  };
}

/**
 * The unread count alone, for the profile row that opens the inbox.
 *
 * It asks for one row (`limit: 1`) instead of the page: the profile needs the
 * number, not the list, and a full page would be twenty rows the screen throws
 * away. A failure is silent here on purpose — the row stays neutral and the
 * inbox itself reports the error when it opens.
 */
export function useUnreadCount({ token }) {
  const [nonLette, setNonLette] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let attivo = true;
      if (!token) {
        return () => {
          attivo = false;
        };
      }
      void getNotifications(token, { limit: 1 })
        .then((risposta) => {
          if (attivo) {
            setNonLette(risposta.nonLette);
          }
        })
        .catch(() => {
          if (attivo) {
            setNonLette(null);
          }
        });
      return () => {
        attivo = false;
      };
    }, [token]),
  );

  return nonLette;
}

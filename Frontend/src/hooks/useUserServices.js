import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { getUserServices } from '@/api/areas/services';

/**
 * Another person's published services, for the mini-card inside the service
 * detail.
 *
 * Three rules it must not break:
 *
 * 1. **A late answer for a previous owner is dropped.** The payload is stored
 *    together with the id it belongs to and read back only while that id is
 *    still the current one (`stato.ownerId === ownerId`), so the modal moving
 *    from one person to another can never show somebody else's services under
 *    the new name.
 * 2. **`403`/`404` are "nothing to show", not failures**: an inactive account or
 *    an owner that disappeared is not something a retry fixes, so the card says
 *    it in its empty state instead of offering a button that would fail again.
 * 3. **`loading` is derived, not stored**: it is true while no answer exists for
 *    the person on screen. That keeps "loading", "loaded and empty" and "failed"
 *    three different things without an extra state that can drift from `dati`.
 *
 * The fetch lives in an effect because it depends on an external system (the
 * API) and on the owner the modal was opened for; every `setState` happens after
 * the `await`, so the effect never triggers a cascading render.
 */
export function useUserServices({ token, ownerId }) {
  const [stato, setStato] = useState({ ownerId: null, dati: null });
  const [errore, setErrore] = useState(null);
  const [nonDisponibile, setNonDisponibile] = useState(false);
  const [ricaricando, setRicaricando] = useState(false);

  const richiestaRef = useRef(0);
  const idValido = Number.isInteger(ownerId) && ownerId > 0;

  const carica = useCallback(async () => {
    if (!token || !idValido) {
      return;
    }
    const seq = ++richiestaRef.current;
    try {
      const risposta = await getUserServices(token, ownerId);
      if (seq !== richiestaRef.current) {
        return;
      }
      setStato({ ownerId, dati: risposta });
      setNonDisponibile(false);
      setErrore(null);
    } catch (err) {
      if (seq !== richiestaRef.current) {
        return;
      }
      const status = err instanceof ApiError ? err.status : null;
      if (status === 403 || status === 404) {
        setNonDisponibile(true);
        setStato({ ownerId, dati: null });
        setErrore(null);
      } else {
        setErrore(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      }
    }
  }, [idValido, ownerId, token]);

  useEffect(() => {
    // The request starts on the next tick, not inside the effect body: the first
    // state update belongs after the `await`, and a task queued here keeps the
    // effect from rendering the same commit twice. The cleanup cancels the task
    // and invalidates whatever was already in flight.
    const attesa = setTimeout(() => {
      void carica();
    }, 0);
    return () => {
      clearTimeout(attesa);
      richiestaRef.current += 1;
    };
  }, [carica]);

  /** Called from the retry button, never from an effect. */
  const riprova = useCallback(async () => {
    setRicaricando(true);
    setErrore(null);
    setNonDisponibile(false);
    try {
      await carica();
    } finally {
      setRicaricando(false);
    }
  }, [carica]);

  const dati = stato.ownerId === ownerId ? stato.dati : null;

  return {
    dati,
    disponibile: idValido,
    caricamento: idValido && dati === null && errore === null && !nonDisponibile,
    ricaricando,
    errore,
    nonDisponibile,
    riprova,
  };
}

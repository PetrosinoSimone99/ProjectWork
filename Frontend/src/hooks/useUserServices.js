import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { getUserServices } from '@/api/areas/services';

/**
 * Another person's published services, for the mini-card inside the service
 * detail.
 *
 * Four rules it must not break:
 *
 * 1. **A late answer for a previous owner is dropped.** Everything the request
 *    produced — payload, error, "this person has no public page" — is stored
 *    together with the id it belongs to and read back only while that id is
 *    still the current one (`esito.ownerId === ownerId`). The modal moving from
 *    one person to another therefore never shows the previous person's data,
 *    error or empty state, not even for one round trip.
 * 2. **`403` and `404` are two different sentences.** `404` is the owner: an
 *    unknown or inactive account, nothing to retry. `403` is the **viewer**: the
 *    backend's `activeUser()` refuses the call for an inactive account of the
 *    person reading, so blaming the offerer would be a lie against
 *    `MarketplaceController::listUserServices` (and `docs/api.md`).
 * 3. **A failure that a retry can fix offers a retry**; the other two do not.
 * 4. **`loading` is derived**, not stored: true while no answer exists for the
 *    person on screen, so "loading", "loaded and empty", "gone" and "failed"
 *    stay four different states without an extra flag that can drift.
 *
 * The fetch lives in an effect because it depends on an external system (the
 * API) and on the owner the modal was opened for; every `setState` happens after
 * the `await`, so the effect never triggers a cascading render.
 */
export function useUserServices({ token, ownerId }) {
  const [esito, setEsito] = useState({ ownerId: null, dati: null, errore: null, mancante: false });
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
      setEsito({ ownerId, dati: risposta, errore: null, mancante: false });
    } catch (err) {
      if (seq !== richiestaRef.current) {
        return;
      }
      const status = err instanceof ApiError ? err.status : null;
      if (status === 404) {
        setEsito({ ownerId, dati: null, errore: null, mancante: true });
      } else if (status === 403) {
        setEsito({ ownerId, dati: null, errore: null, mancante: false, vietato: true });
      } else {
        const messaggio = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
        setEsito({ ownerId, dati: null, errore: messaggio, mancante: false });
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
    try {
      await carica();
    } finally {
      setRicaricando(false);
    }
  }, [carica]);

  const corrente = esito.ownerId === ownerId ? esito : null;
  const dati = corrente?.dati ?? null;
  const errore = corrente?.errore ?? null;
  const mancante = corrente?.mancante ?? false;
  const vietato = corrente?.vietato ?? false;

  return {
    dati,
    disponibile: idValido,
    caricamento: idValido && corrente === null,
    ricaricando,
    errore,
    mancante,
    vietato,
    riprova,
  };
}

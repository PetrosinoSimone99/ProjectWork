import { useEffect, useMemo, useState } from 'react';
import { tokenExpiresAt } from '@/auth/token-store';

/**
 * Quanto prima si avvisa che la sessione sta per scadere.
 *
 * Cinque minuti: il tempo di finire quello che si sta scrivendo, non tanto da
 * tenere un avviso a schermo mentre l'utente lavora. La scelta è legata al
 * modello attuale — il token dura **un'ora** e **non c'è rinnovo** — quindi
 * l'avviso non promette niente e non ha azioni: serve solo a non farsi
 * sorprendere dal ritorno al login (`30-frontend/sessione-e-token.md`).
 */
export const SOGLIA_AVVISO_MINUTI = 5;

/**
 * Ogni quanto si ricalcola il tempo che manca.
 *
 * Trenta secondi bastano: l'avviso parla di minuti, non di secondi, quindi un
 * tick più fitto non cambierebbe quello che si legge. Non si legge l'orologio al
 * render ma dentro i callback, così non ci sono render a cascata.
 */
export const TICK_MS = 30_000;

/** Millisecondi di un minuto: un nome per un numero che altrimenti sarebbe magico. */
const MS_PER_MINUTO = 60_000;

/**
 * Quanto manca alla scadenza della sessione, per poterlo dire **prima** che
 * succeda.
 *
 * Prende `token` da `useAuth()` e non chiama nessuno: la scadenza è scritta nel
 * payload del token e si legge in locale (`tokenExpiresAt`). Restituisce:
 *
 * - `minutiResidui`: i minuti che restano, arrotondati verso l'alto (con 90
 *   secondi si legge «2 min»), oppure `null` se la scadenza non è leggibile;
 * - `inScadenza`: `true` **solo** sotto la soglia e **solo** finché il token non
 *   è scaduto. Con un token scaduto non si mostra niente: l'avviso direbbe
 *   un'ora che è già passata, e la sessione la chiude comunque il primo `401`
 *   (`client.js`), che è il comportamento di sempre;
 * - `scadenzaMs`: la scadenza in millisecondi, per chi deve scrivere l'orario.
 *
 * Un token assente o illeggibile dà `inScadenza: false`: non si avvisa di una
 * sessione che non si sa leggere, e non si inventa una scadenza. Nessuno stato
 * da gestire nelle schermate: chi non vuole l'avviso non monta il componente.
 */
export function useScadenzaSessione(token) {
  // La stessa scadenza vale finché non cambia il token: si legge una volta sola
  // per token, non a ogni render.
  const scadenzaMs = useMemo(() => {
    const secondi = token ? tokenExpiresAt(token) : null;
    return secondi === null ? null : secondi * 1000;
  }, [token]);

  const leggibile = scadenzaMs !== null;
  const [adesso, setAdesso] = useState(() => Date.now());

  useEffect(() => {
    if (!leggibile) {
      return undefined;
    }
    // Il primo aggiornamento passa da un `setTimeout` e non da una scrittura
    // sincrona nell'effetto: così il residuo è fresco appena cambia il token,
    // senza render a cascata.
    const aggiorna = () => setAdesso(Date.now());
    const immediato = setTimeout(aggiorna, 0);
    const intervallo = setInterval(aggiorna, TICK_MS);
    return () => {
      clearTimeout(immediato);
      clearInterval(intervallo);
    };
  }, [leggibile, scadenzaMs]);

  if (!leggibile) {
    return { minutiResidui: null, inScadenza: false, scadenzaMs: null };
  }

  const minutiResidui = Math.ceil((scadenzaMs - adesso) / MS_PER_MINUTO);
  return {
    minutiResidui,
    inScadenza: minutiResidui > 0 && minutiResidui <= SOGLIA_AVVISO_MINUTI,
    scadenzaMs,
  };
}

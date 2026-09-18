import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Ogni quanto si ricalcola il residuo.
 *
 * Il conto è in ore e minuti, quindi 15 secondi bastano per non mostrare mai un
 * minuto sbagliato; nell'ora di demo accelerata il numero si muove abbastanza da
 * vederlo. Non è responsabilità del tempo decidere un esito: qui si calcola solo
 * quanto manca.
 */
export const TICK_COUNTDOWN_MS = 15_000;

/** Millisecondi di un minuto: un nome per un numero che altrimenti sarebbe magico. */
const MS_PER_MINUTO = 60_000;

/**
 * Il conto alla rovescia a partire da una **scadenza assoluta** (epoch in
 * millisecondi), che arriva già normalizzata dal layer API: qui non si fa
 * parsing di date e non si salva niente da nessuna parte. La verità è una sola,
 * il backend.
 *
 * Tre comportamenti, dichiarati:
 * - `scadenzaMs` assente o non numerica → `illeggibile: true`, nessun numero (la
 *   UI dice «La scadenza non è ancora disponibile»);
 * - il residuo si ricalcola ogni `TICK_COUNTDOWN_MS` e **subito** al ritorno in
 *   primo piano dell'app (`AppState` → `'active'`), che è il momento in cui
 *   l'orologio e il dato possono essersi allontanati; cambiare `scadenzaMs`
 *   ri-renderizza e il residuo è già fresco, perché `Date.now()` si legge al
 *   render e non si conserva;
 * - l'intervallo si spegne nel cleanup, senza scrivere su un componente smontato.
 *
 * Il residuo negativo non si mostra mai: `scaduto` lo segnala e la schermata
 * chiede un aggiornamento, senza dichiarare nessun esito.
 */
export function useTempoResiduo(scadenzaMs) {
  const valida = Number.isFinite(scadenzaMs);
  const [adesso, setAdesso] = useState(() => Date.now());

  useEffect(() => {
    if (!valida) {
      return undefined;
    }
    // `Date.now()` si legge dentro i callback (mai al render) e il primo
    // aggiornamento passa da un `setTimeout`, non da una scrittura sincrona
    // nell'effetto: così il residuo è fresco appena arriva una scadenza nuova
    // senza provocare render a cascata.
    const aggiorna = () => setAdesso(Date.now());
    const immediato = setTimeout(aggiorna, 0);
    const intervallo = setInterval(aggiorna, TICK_COUNTDOWN_MS);
    const sottoscrizione = AppState.addEventListener('change', (stato) => {
      if (stato === 'active') {
        aggiorna();
      }
    });
    return () => {
      clearTimeout(immediato);
      clearInterval(intervallo);
      sottoscrizione.remove();
    };
  }, [valida, scadenzaMs]);

  if (!valida) {
    return { minutiResidui: null, scaduto: false, illeggibile: true };
  }

  const residuo = scadenzaMs - adesso;
  return {
    // Verso l'alto: con 90 secondi il residuo si legge «2 min», non «1 min».
    minutiResidui: Math.ceil(residuo / MS_PER_MINUTO),
    scaduto: residuo <= 0,
    illeggibile: false,
  };
}

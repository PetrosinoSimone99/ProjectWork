import { useSyncExternalStore } from 'react';

/**
 * Quello che il **chrome del web** deve sapere della schermata che sta
 * mostrando: se ha un refresh da offrire.
 *
 * Perché esiste. La barra di navigazione (`WebNavMenu`) e il refresh non sono
 * nella stessa parte dell'albero: la barra la monta `app/_layout.jsx`, il
 * refresh lo possiede la schermata (la coppia `refreshing`/`onRefresh` di
 * `useRefresh`). Prima, per non averli nello stesso posto, `Screen` disegnava
 * una banda riga tutta sua sopra il contenuto: 82 pt di altezza su ogni
 * schermata, un secondo bordo destro che non coincideva con quello della
 * colonna, e su mobile il primo servizio che cominciava a metà viewport.
 *
 * Ora `Screen` **pubblica** la sua coppia e la barra la disegna accanto al
 * menu, nella stessa riga e nello stesso oggetto. La regola di `DESIGN.md`
 * § Refresh non cambia: un solo controllo, in alto a destra, fuori dallo
 * scroll. Cambia solo chi lo disegna.
 *
 * Uno store di modulo invece di un context: i due lati non hanno un antenato
 * comune che non sia la radice dell'app, e un context sulla radice farebbe
 * ri-renderizzare l'intero albero a ogni cambio di `refreshing`.
 */

/** Lo stato pubblicato, o `null` quando la schermata in focus non ne ha. */
let stato = null;
const iscritti = new Set();

function notifica() {
  for (const iscritto of iscritti) {
    iscritto();
  }
}

function sottoscrivi(iscritto) {
  iscritti.add(iscritto);
  return () => {
    iscritti.delete(iscritto);
  };
}

function leggi() {
  return stato;
}

/** Nessuno pubblica niente durante il primo render: la barra parte senza refresh. */
function leggiSulServer() {
  return null;
}

export function annunciaChromeWeb(prossimo) {
  if (prossimo === stato) {
    return;
  }
  stato = prossimo;
  notifica();
}

/**
 * Il chrome pubblicato dalla schermata in focus. `null` quando non c'è.
 *
 * @returns {null | { onRefresh: (() => void) | null, refreshing: boolean }}
 */
export function useChromeWeb() {
  return useSyncExternalStore(sottoscrivi, leggi, leggiSulServer);
}

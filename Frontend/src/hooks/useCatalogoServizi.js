import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/api/client';
import { ottieniCatalogo } from '@/api/barattolo';
import { contaFiltri, nuoviFiltri } from '@/servizi/offerta-ricerca';
import { useAggiornamento } from '@/hooks/useAggiornamento';

/**
 * Lo stato del catalogo della home: filtri, richieste, guardia sulle risposte
 * fuori ordine, ricarica al focus della tab e pull-to-refresh. È l'unico posto
 * in cui la schermata parla col layer API.
 *
 * Estratto da `(tabs)/index.jsx` (era dentro `SearchScreen`) per due motivi: il
 * file superava la soglia di righe indicata dalle regole del progetto, e la
 * guardia sulla sequenza è la parte più delicata da rompere senza accorgersene —
 * isolata in un hook, chi disegna la lista non può disattivarla per distrazione.
 *
 * Quattro cose che sembrano dettagli e non lo sono:
 *
 * 1. **Le risposte fuori ordine non sovrascrivono quelle più recenti**
 *    (`requestSeqRef`): una risposta si applica solo se nessuna richiesta più
 *    recente è già partita.
 * 2. **La ricarica al focus non cancella risultati filtrati**: si ricarica solo
 *    quando **nessun filtro è applicato**. La condizione si legge dal ref dei
 *    filtri *applicati* — non dalla bozza — così cambiare i filtri non riavvia
 *    l'effetto e non nasce un doppio fetch.
 * 3. **`filtriApplicati` si aggiorna solo quando una risposta viene applicata**,
 *    non quando una richiesta parte: descrive quello che c'è a schermo.
 * 4. **«Riprova» ripete la richiesta fallita** (`ultimaRichiestaRef`), non i
 *    filtri in bozza: chi ha sbagliato a filtrare azzera, chi ha avuto un errore
 *    riprova.
 */
export function useCatalogoServizi({ token, utenteId }) {
  const [servizi, setServizi] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [filtri, setFiltri] = useState(nuoviFiltri);
  const [filtriApplicati, setFiltriApplicati] = useState(nuoviFiltri);

  // Incrementato a ogni nuova richiesta (filtro, azzeramento, ricarica della home):
  // una risposta che arriva quando è già partita una richiesta più recente viene
  // ignorata, così una richiesta lenta non può sovrascrivere quella dopo.
  const requestSeqRef = useRef(0);

  // I filtri che hanno prodotto quello che è a schermo. Letto dentro gli effetti
  // senza innescarne i re-run (da qui il ref e non lo stato).
  const filtriApplicatiRef = useRef(nuoviFiltri());

  // I filtri dell'ultima richiesta partita, anche se è fallita: è quello che
  // «Riprova» ripete.
  const ultimaRichiestaRef = useRef(nuoviFiltri());

  const esegui = useCallback(
    async (filtriRichiesti) => {
      if (!token) {
        return;
      }
      const seq = ++requestSeqRef.current;
      ultimaRichiestaRef.current = filtriRichiesti;
      setCaricamento(true);
      setErrore(null);
      try {
        const elenco = await ottieniCatalogo(token, utenteId, filtriRichiesti);
        if (seq !== requestSeqRef.current) {
          return; // richiesta superata: la risposta è stale, non aggiornare la UI.
        }
        setServizi(elenco);
        setFiltriApplicati(filtriRichiesti);
        filtriApplicatiRef.current = filtriRichiesti;
      } catch (err) {
        if (seq !== requestSeqRef.current) {
          return;
        }
        // Il contenuto precedente resta a schermo (l'attesa e l'errore lo dicono
        // il pulsante «Filtra» e il Banner): una schermata che sparisce per un
        // ricarico fallito è peggio di un dato vecchio e un avviso.
        setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
      } finally {
        if (seq === requestSeqRef.current) {
          setCaricamento(false);
        }
      }
    },
    [token, utenteId],
  );

  // La home si ricarica quando la tab torna in primo piano, **tranne** che con
  // dei filtri applicati: i risultati non devono sparire sotto il catalogo. Da
  // qui `azzeraFiltri()` riporta `filtriApplicati` a vuoto e la ricarica torna
  // attiva — è il modo per rivedere il catalogo aggiornato dopo aver filtrato.
  useFocusEffect(
    useCallback(() => {
      if (contaFiltri(filtriApplicatiRef.current) > 0) {
        return undefined;
      }
      void esegui(filtriApplicatiRef.current);
      return () => {
        // Fuori dal focus la risposta in volo non deve applicarsi alla UI.
        requestSeqRef.current += 1;
      };
    }, [esegui]),
  );

  /** Testo e località: cambiano la bozza senza fare richieste (si applicano con Invio). */
  const cambiaTesto = useCallback((campo, valore) => {
    setFiltri((correnti) => ({ ...correnti, [campo]: valore }));
  }, []);

  /** Categoria e modalità: la scelta è discreta e non ha costo, quindi chiede subito. */
  const cambiaScelta = useCallback(
    (campo, valore) => {
      const prossimi = { ...filtri, [campo]: valore };
      setFiltri(prossimi);
      void esegui(prossimi);
    },
    [esegui, filtri],
  );

  /** Invio o pulsante «Filtra»: richiede con i filtri correnti. */
  const applicaFiltri = useCallback(() => {
    void esegui(filtri);
  }, [esegui, filtri]);

  /** La X nel campo di testo: azzera solo il testo e riapplica gli altri filtri. */
  const azzeraTesto = useCallback(() => {
    const prossimi = { ...filtri, testo: '' };
    setFiltri(prossimi);
    void esegui(prossimi);
  }, [esegui, filtri]);

  /** «Azzera filtri»: svuota tutto e richiede il catalogo intero. */
  const azzeraFiltri = useCallback(() => {
    const vuoti = nuoviFiltri();
    setFiltri(vuoti);
    void esegui(vuoti);
  }, [esegui]);

  /** «Riprova»: ripete la richiesta fallita, con i filtri che l'avevano prodotta. */
  const riprova = useCallback(() => {
    void esegui(ultimaRichiestaRef.current);
  }, [esegui]);

  // Pull-to-refresh: ripete quello che c'è a schermo, senza scartare il contesto.
  const aggiorna = useCallback(() => esegui(filtriApplicatiRef.current), [esegui]);
  const { refreshing, onRefresh } = useAggiornamento(aggiorna);

  return {
    servizi,
    caricamento,
    errore,
    filtri,
    filtriApplicati,
    cambiaTesto,
    cambiaScelta,
    applicaFiltri,
    azzeraTesto,
    azzeraFiltri,
    riprova,
    refreshing,
    onRefresh,
  };
}

import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/api/client';
import { ottieniCatalogo } from '@/api/barattolo';
import { contaFiltri, nuoviFiltri } from '@/servizi/offerta-ricerca';
import { useAggiornamento } from '@/hooks/useAggiornamento';

/**
 * Lo stato del catalogo della home: filtri, richieste, paginazione («Carica
 * altri»), guardia sulle risposte fuori ordine, ricarica al focus della tab e
 * pull-to-refresh. È l'unico posto in cui la schermata parla col layer API.
 *
 * Estratto da `(tabs)/index.jsx` (era dentro `SearchScreen`) per due motivi: il
 * file superava la soglia di righe indicate dalle regole del progetto, e la
 * guardia sulla sequenza è la parte più delicata da rompere senza accorgersene —
 * isolata in un hook, chi disegna la lista non può disattivarla per distrazione.
 *
 * Cinque cose che sembrano dettagli e non lo sono:
 *
 * 1. **Le risposte fuori ordine non sovrascrivono quelle più recenti**
 *    (`requestSeqRef`): una risposta si applica solo se nessuna richiesta più
 *    recente è già partita. La regola vale **anche per «Carica altri»**: una
 *    risposta appendente arrivata dopo un cambio filtro viene scartata, non si
 *    incolla alla lista nuova.
 * 2. **La ricarica al focus non cancella risultati filtrati**: si ricarica solo
 *    quando **nessun filtro è applicato**. La condizione si legge dal ref dei
 *    filtri *applicati* — non dalla bozza — così cambiare i filtri non riavvia
 *    l'effetto e non nasce un doppio fetch.
 * 3. **`filtriApplicati` si aggiorna solo quando una risposta viene applicata**,
 *    non quando una richiesta parte: descrive quello che c'è a schermo.
 * 4. **«Riprova» ripete la richiesta fallita così com'era** (`ultimaRichiestaRef`):
 *    filtri **e** pagina. Chi ha sbagliato a filtrare azzera, chi ha avuto un
 *    errore riprova — e il «Riprova» di «Carica altri» ripete proprio la pagina
 *    che non è arrivata.
 * 5. **«Carica altri» appende in copia** (`[...correnti, ...elenco]`): l'array a
 *    schermo non si muta mai, e ogni richiesta porta con sé la propria pagina.
 */
export function useCatalogoServizi({ token, utenteId }) {
  const [servizi, setServizi] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [paginazione, setPaginazione] = useState(null);
  const [caricamentoAltri, setCaricamentoAltri] = useState(false);
  const [erroreAltri, setErroreAltri] = useState(null);
  const [filtri, setFiltri] = useState(nuoviFiltri);
  const [filtriApplicati, setFiltriApplicati] = useState(nuoviFiltri);

  // Incrementato a ogni nuova richiesta (filtro, azzeramento, «Carica altri»,
  // ricarica della home): una risposta che arriva quando è già partita una
  // richiesta più recente viene ignorata, così una richiesta lenta non può
  // sovrascrivere quella dopo.
  const requestSeqRef = useRef(0);

  // I filtri che hanno prodotto quello che è a schermo. Letto dentro gli effetti
  // senza innescarne i re-run (da qui il ref e non lo stato).
  const filtriApplicatiRef = useRef(nuoviFiltri());

  // La paginazione di quello che è a schermo: «Carica altri» chiede la pagina
  // dopo leggendola da qui, per lo stesso motivo di `filtriApplicatiRef`.
  const paginazioneRef = useRef(null);

  // La richiesta dell'ultima volta partita, anche se è fallita: è quello che
  // «Riprova» ripete (filtri, pagina e se era un «Carica altri»).
  const ultimaRichiestaRef = useRef({ filtri: nuoviFiltri(), pagina: 1, inCoda: false });

  const esegui = useCallback(
    async (filtriRichiesti, pagina = 1, inCoda = false) => {
      if (!token) {
        return;
      }
      const seq = ++requestSeqRef.current;
      ultimaRichiestaRef.current = { filtri: filtriRichiesti, pagina, inCoda };
      if (inCoda) {
        setCaricamentoAltri(true);
        setErroreAltri(null);
      } else {
        setCaricamento(true);
        // Un filtro nuovo rende vecchio anche l'eventuale errore di «Carica altri».
        setErrore(null);
        setErroreAltri(null);
      }
      try {
        const { elenco, paginazione: nuovaPaginazione } = await ottieniCatalogo(
          token,
          utenteId,
          filtriRichiesti,
          pagina,
        );
        if (seq !== requestSeqRef.current) {
          return; // richiesta superata: la risposta è stale, non aggiornare la UI.
        }
        setServizi((correnti) => (inCoda ? [...(correnti ?? []), ...elenco] : elenco));
        setPaginazione(nuovaPaginazione);
        paginazioneRef.current = nuovaPaginazione;
        if (!inCoda) {
          setFiltriApplicati(filtriRichiesti);
          filtriApplicatiRef.current = filtriRichiesti;
        }
      } catch (err) {
        if (seq !== requestSeqRef.current) {
          return;
        }
        // Il contenuto precedente resta a schermo (l'attesa e l'errore lo dicono
        // il pulsante «Filtra» e il Banner): una schermata che sparisce per un
        // ricarico fallito è peggio di un dato vecchio e un avviso.
        const messaggio = err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.';
        if (inCoda) {
          setErroreAltri(messaggio);
        } else {
          setErrore(messaggio);
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setCaricamento(false);
          setCaricamentoAltri(false);
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

  /** Testo: cambia la bozza senza fare richieste (si applica con Invio o «Filtra»). */
  const cambiaTesto = useCallback((campo, valore) => {
    setFiltri((correnti) => ({ ...correnti, [campo]: valore }));
  }, []);

  /**
   * Categoria, regione e provincia: scelte discrete, quindi chiedono subito.
   * Cambiare regione azzera la provincia (cascata): le province della regione
   * vecchia non hanno senso nella nuova. Una sola richiesta, mai due.
   */
  const cambiaScelta = useCallback(
    (campo, valore) => {
      const prossimi =
        campo === 'regione'
          ? { ...filtri, regione: valore, provincia: '' }
          : { ...filtri, [campo]: valore };
      setFiltri(prossimi);
      void esegui(prossimi);
    },
    [esegui, filtri],
  );

  /** Invio o pulsante «Filtra»: richiede con i filtri correnti, tornando a pagina 1. */
  const applicaFiltri = useCallback(() => {
    void esegui(filtri);
  }, [esegui, filtri]);

  /** La X nel campo di testo: azzera solo il testo e riapplica gli altri filtri. */
  const azzeraTesto = useCallback(() => {
    const prossimi = { ...filtri, testo: '' };
    setFiltri(prossimi);
    void esegui(prossimi);
  }, [esegui, filtri]);

  /** «Azzera filtri»: svuota tutto e richiede il catalogo intero, da pagina 1. */
  const azzeraFiltri = useCallback(() => {
    const vuoti = nuoviFiltri();
    setFiltri(vuoti);
    void esegui(vuoti);
  }, [esegui]);

  /** «Riprova»: ripete la richiesta fallita, con filtri e pagina che l'avevano prodotta. */
  const riprova = useCallback(() => {
    const ultima = ultimaRichiestaRef.current;
    void esegui(ultima.filtri, ultima.pagina, ultima.inCoda);
  }, [esegui]);

  /** «Carica altri»: la pagina dopo, in coda a quello che c'è già. */
  const caricaAltri = useCallback(() => {
    const ultima = paginazioneRef.current;
    if (ultima === null || ultima.pagina === null || ultima.pagineTotali === null) {
      return;
    }
    if (ultima.pagina >= ultima.pagineTotali) {
      return; // non ci sono altre pagine: il pulsante non dovrebbe nemmeno esserci.
    }
    void esegui(filtriApplicatiRef.current, ultima.pagina + 1, true);
  }, [esegui]);

  // Pull-to-refresh: ripete quello che c'è a schermo, senza scartare il contesto.
  // Ricarica la pagina 1: le pagine incollate con «Carica altri» tornano
  // premendo di nuovo il pulsante.
  const aggiorna = useCallback(() => esegui(filtriApplicatiRef.current), [esegui]);
  const { refreshing, onRefresh } = useAggiornamento(aggiorna);

  return {
    servizi,
    caricamento,
    errore,
    paginazione,
    caricamentoAltri,
    erroreAltri,
    filtri,
    filtriApplicati,
    cambiaTesto,
    cambiaScelta,
    applicaFiltri,
    azzeraTesto,
    azzeraFiltri,
    riprova,
    caricaAltri,
    refreshing,
    onRefresh,
  };
}

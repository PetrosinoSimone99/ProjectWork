import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { getHomeCatalog } from '@/api';
import { contaFiltri, nuoviFiltri } from '@/services/offer-request';
import { useRefresh } from '@/hooks/useRefresh';

/**
 * Per quanto una lista appena letta vale come «fresca».
 *
 * Il backend è la velocità percepita del prodotto (audit P2: mediana 4,01 s per
 * chiamata): tornare sulla tab non deve ripagarla ogni volta. Dentro questa
 * finestra la ricarica al focus si salta. Il catalogo non è nelle famiglie dello
 * stream (`api/stream.js`: accordi, chat, profilo, coda), quindi qui la prova
 * che la copia a schermo è corrente è la sola età della lettura.
 */
export const FINESTRA_FRESCHEZZA_MS = 30000;

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
 *    filtri *applicati* — non dai filtri correnti — così cambiare i filtri non riavvia
 *    l'effetto e non nasce un doppio fetch.
 * 3. **La ricarica al focus è un ripiego, non l'unica via**: si salta quando la
 *    lista a schermo è stata letta da meno di `FINESTRA_FRESCHEZZA_MS` e quando
 *    ci sono pagine incollate con «Carica altri» — un ritorno sulla tab non deve
 *    buttare via la finestra che l'utente ha già caricato. Filtri, «Riprova» e
 *    pull-to-refresh passano da `esegui` direttamente e ignorano la regola: una
 *    richiesta manuale è sempre una richiesta.
 * 4. **`caricamento` è il primo caricamento (o una richiesta chiesta da un
 *    comando), `aggiornamento` è la rilettura in secondo piano**: così nessuna
 *    schermata svuota la lista in un ritorno sulla tab, e le due attese restano
 *    distinguibili.
 * 5. **`filtriApplicati` si aggiorna solo quando una risposta viene applicata**,
 *    non quando una richiesta parte: descrive quello che c'è a schermo.
 * 4. **«Riprova» ripete la richiesta fallita così com'era** (`ultimaRichiestaRef`):
 *    filtri **e** pagina. Chi ha sbagliato a filtrare azzera, chi ha avuto un
 *    errore riprova — e il «Riprova» di «Carica altri» ripete proprio la pagina
 *    che non è arrivata.
 * 5. **«Carica altri» appende in copia** (`[...correnti, ...elenco]`): l'array a
 *    schermo non si muta mai, e ogni richiesta porta con sé la propria pagina.
 * 6. **La modalità è un filtro come gli altri**: `GET /api/services` accetta
 *    `isRemote=true|false`, quindi `cambiaModalita` chiama `esegui` come le
 *    scelte discrete — una richiesta al server. Anche l'ordinamento per
 *    rilevanza è del backend (priorità alle categorie delle mie richieste su
 *    tutto il catalogo, prima della paginazione): qui non si riordina e non si
 *    filtra più niente.
 */
export function useServiceCatalog({ token, utenteId }) {
  const [servizi, setServizi] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [aggiornamento, setAggiornamento] = useState(false);
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

  // Se una risposta è mai stata applicata, e quando: decidono fra primo
  // caricamento e aggiornamento, e se il ritorno sulla tab può saltare la
  // chiamata (`convieneRicaricare`). Mai resi nello stato: un timestamp renderizzato
  // riavvierebbe l'effetto di fuoco a ogni risposta.
  const haDatiRef = useRef(false);
  const ultimaLetturaRef = useRef(0);

  const esegui = useCallback(
    async (filtriRichiesti, pagina = 1, inCoda = false, inSfondo = false) => {
      if (!token) {
        return;
      }
      const seq = ++requestSeqRef.current;
      ultimaRichiestaRef.current = { filtri: filtriRichiesti, pagina, inCoda };
      if (inCoda) {
        setCaricamentoAltri(true);
        setErroreAltri(null);
      } else if (inSfondo) {
        // Ripiego del ritorno sulla tab: la lista a schermo resta, l'attesa vive
        // in `aggiornamento` e non spegne il pulsante «Filtra».
        setAggiornamento(true);
        setErrore(null);
        setErroreAltri(null);
      } else {
        setCaricamento(true);
        // Un filtro nuovo rende vecchio anche l'eventuale errore di «Carica altri».
        setErrore(null);
        setErroreAltri(null);
      }
      try {
        const { elenco, paginazione: nuovaPaginazione } = await getHomeCatalog(
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
        haDatiRef.current = true;
        ultimaLetturaRef.current = Date.now();
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
        const messaggio = err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE;
        if (inCoda) {
          setErroreAltri(messaggio);
        } else {
          setErrore(messaggio);
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setCaricamento(false);
          setAggiornamento(false);
          setCaricamentoAltri(false);
        }
      }
    },
    [token, utenteId],
  );

  /**
   * Se il ritorno sulla tab deve chiedere di nuovo.
   *
   * Tre no: con dei filtri applicati (i risultati non devono sparire sotto il
   * catalogo), con pagine già incollate (tornare a pagina 1 butterebbe via
   * quello che l'utente ha caricato) e dentro la finestra di freschezza. Legge
   * solo ref, quindi non dipende da niente che cambi a ogni render.
   */
  const convieneRicaricare = useCallback(() => {
    if (contaFiltri(filtriApplicatiRef.current) > 0) {
      return false;
    }
    if ((paginazioneRef.current?.pagina ?? 1) > 1) {
      return false;
    }
    if (!haDatiRef.current) {
      return true; // primo giro: non c'è niente a schermo da tenere.
    }
    return Date.now() - ultimaLetturaRef.current >= FINESTRA_FRESCHEZZA_MS;
  }, []);

  // La home si ricarica quando la tab torna in primo piano, **tranne** che con
  // dei filtri applicati, con pagine già incollate o dentro la finestra di
  // freschezza: i risultati non devono sparire né tornare a pagina 1 sotto il
  // catalogo. Da qui `azzeraFiltri()` riporta `filtriApplicati` a vuoto e la
  // ricarica torna attiva — è il modo per rivedere il catalogo aggiornato dopo
  // aver filtrato; il pull-to-refresh è il comando manuale che riparte sempre.
  useFocusEffect(
    useCallback(() => {
      if (convieneRicaricare()) {
        void esegui(filtriApplicatiRef.current, 1, false, true);
      }
      return () => {
        // Fuori dal focus la risposta in volo non deve applicarsi alla UI.
        // La sequenza invalidata basta a scartarla, ma il suo `finally` non
        // spegnerebbe più i flag (la seq non combacia): senza queste righe
        // «Carica altri» resterebbe in spinner per sempre al ritorno sulla tab.
        requestSeqRef.current += 1;
        setCaricamento(false);
        setAggiornamento(false);
        setCaricamentoAltri(false);
      };
    }, [esegui, convieneRicaricare]),
  );

  /**
   * Categoria, provincia e comune: scelte discrete, quindi chiedono subito.
   * Cambiare provincia azzera il comune (cascata): i comuni della provincia
   * vecchia non hanno senso nella nuova. Una sola richiesta, mai due.
   *
   * Come `cambiaModalita`, la richiesta parte dai filtri **applicati**, non
   * dai correnti (audit UX F06): una scelta discreta non deve applicare di
   * nascosto il testo digitato e mai confermato con «Cerca». `filtri` riceve
   * solo la scelta fatta, per restare coerente con ciò che è a schermo.
   */
  const cambiaScelta = useCallback(
    (campo, valore) => {
      // Un comune senza provincia non è un filtro: fra il cambio di provincia e
      // la risposta del server i filtri applicati hanno ancora la provincia
      // vecchia (o nessuna) mentre la tendina del comune è già aperta. Si ignora
      // la scelta invece di contare un filtro che la query poi scarta.
      if (campo === 'comune' && !filtriApplicatiRef.current.provincia) {
        return;
      }
      const prossimi =
        campo === 'provincia'
          ? { ...filtriApplicatiRef.current, provincia: valore, comune: '' }
          : { ...filtriApplicatiRef.current, [campo]: valore };
      setFiltri((correnti) =>
        campo === 'provincia'
          ? { ...correnti, provincia: valore, comune: '' }
          : { ...correnti, [campo]: valore },
      );
      void esegui(prossimi);
    },
    [esegui],
  );

  /**
   * Invio o pulsante «Cerca»: richiede con i filtri correnti più il testo
   * arrivato dalla barra, tornando a pagina 1. Il testo non passa da `filtri`:
   * lo possiede `FilterBar`, così ogni tasto non ri-renderizza il catalogo.
   */
  const applicaFiltri = useCallback((testo) => {
    void esegui({ ...filtri, testo });
  }, [esegui, filtri]);

  /**
   * La X nel campo di testo: azzera **solo** il testo e riapplica gli altri
   * filtri. Riparte dai filtri applicati (audit UX F05/F06): categoria, area e
   * modalità viaggiano esattamente come sono a schermo, quindi il tasto non
   * le azzera e non ci infila dentro scelte mai confermate. Su `filtri` non
   * scrive: il testo non vive più qui.
   */
  const azzeraTesto = useCallback(() => {
    const prossimi = { ...filtriApplicatiRef.current, testo: '' };
    void esegui(prossimi);
  }, [esegui]);

  /** «Azzera filtri»: svuota tutto e richiede il catalogo intero, da pagina 1. */
  const azzeraFiltri = useCallback(() => {
    const vuoti = nuoviFiltri();
    setFiltri(vuoti);
    void esegui(vuoti);
  }, [esegui]);

  /**
   * Modalità: scelta discreta, quindi chiede subito al server (come categoria,
   * provincia e comune). `filtriDaQuery` la traduce in `isRemote=true|false`:
   * la lista visibile la decide il backend, pagine comprese.
   *
   * La richiesta parte dai filtri **applicati**, non dai correnti: il testo
   * digitato e non confermato viaggia solo con Invio o «Cerca», e una modalità
   * non deve applicarlo di nascosto. `filtri` riceve la modalità per restare
   * coerente con ciò che è a schermo.
   */
  const cambiaModalita = useCallback(
    (valore) => {
      const prossimi = { ...filtriApplicatiRef.current, modalita: valore };
      setFiltri((correnti) => ({ ...correnti, modalita: valore }));
      void esegui(prossimi);
    },
    [esegui],
  );

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
  const { refreshing, onRefresh } = useRefresh(aggiorna);

  return {
    servizi,
    caricamento,
    aggiornamento,
    errore,
    paginazione,
    caricamentoAltri,
    erroreAltri,
    filtri,
    filtriApplicati,
    cambiaScelta,
    cambiaModalita,
    applicaFiltri,
    azzeraTesto,
    azzeraFiltri,
    riprova,
    caricaAltri,
    refreshing,
    onRefresh,
  };
}

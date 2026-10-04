import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/api/client';
import { decidiProposta, ottieniFeedSwipes, registraScelta } from '@/api/barattolo';
import { DECISIONI_PROPOSTA } from '@/servizi/candidati';
import { useAggiornamento } from '@/hooks/useAggiornamento';

/** Quante schede chiedere al feed per volta: il default del backend, anche qui. */
const LIMITE_FEED = 20;

/**
 * L'esito nella forma della UI: `match` e `propostaId` arrivano dal layer (e
 * `match` è solo quello che il backend ha detto, mai dedotto).
 */
function aEsito(scelta, persona, mansione, risposta) {
  return {
    scelta,
    match: risposta.match === true,
    persona,
    mansione,
    propostaId: risposta.propostaId ?? null,
  };
}

/**
 * La macchina a stati di «Loop»: i candidati dello swipe, le proposte in attesa
 * della mia decisione, la posizione, l'azione in volo e l'esito. È l'unico
 * posto in cui la schermata parla con il layer API.
 *
 * Esiste per lo stesso motivo di `useCatalogoServizi`: la parte delicata — il
 * doppio invio, l'avanzamento, il fatto che l'elenco ricevuto sia già la verità
 * e non una copia locale — sta in un posto solo, e chi disegna la scheda non può
 * disattivarla per distrazione.
 *
 * Cinque cose che sembrano dettagli e non lo sono:
 *
 * 1. **La pila è solo l'array ricevuto.** Le coppie già decise le esclude il
 *    backend, quindi non esiste una seconda pila locale: una scheda scelta non
 *    torna per costruzione.
 * 2. **Una sola azione per volta.** `azioneRef` è sincrono (lo stato di React
 *    non lo è): una seconda azione parte solo quando la prima è finita — scelta
 *    su una scheda **o** decisione su una proposta, mai insieme — e gli stati
 *    `sceltaInCorso`/`decisioneInCorso` dicono quale è in volo, così lo spinner
 *    compare sul comando giusto.
 * 3. **Un errore non fa avanzare**, con un'eccezione dichiarata: il `409` su
 *    una scelta dice che la coppia è **già stata decisa**, cioè che la scheda è
 *    vecchia. Quella salta (e al prossimo caricamento non c'è più); le altre
 *    lasciano la scheda dov'è e `ripristino` la riporta al centro dopo un gesto
 *    oltre soglia non riuscito.
 * 4. **`posizione` si azzera a ogni ricarica**, perché l'elenco che arriva è
 *    già senza le schede scelte: ripartire dall'indice 0 è la cosa giusta.
 * 5. **`match` arriva solo dal backend** (il `matched` della decisione): qui non
 *    si deduce niente, e «È un match!» non può comparire prima.
 */
export function useCandidati({ token, utenteId = null }) {
  const [candidati, setCandidati] = useState(null);
  const [proposte, setProposte] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [posizione, setPosizione] = useState(0);
  const [sceltaInCorso, setSceltaInCorso] = useState(null);
  const [decisioneInCorso, setDecisioneInCorso] = useState(null);
  const [esito, setEsito] = useState(null);
  const [ripristino, setRipristino] = useState(0);

  // Le richieste di caricamento in volo: una risposta si applica solo se nessuna
  // richiesta più recente è già partita (e il pull-to-refresh non litiga con il
  // ritorno sulla scheda).
  const richiestaRef = useRef(0);

  // Guardia sincrona sulle azioni: lo stato di React non ferma due tocchi rapidi.
  const azioneRef = useRef(false);

  const carica = useCallback(async () => {
    if (!token) {
      return;
    }
    const seq = ++richiestaRef.current;
    setCaricamento(true);
    setErrore(null);
    try {
      const feed = await ottieniFeedSwipes(token, LIMITE_FEED, utenteId);
      if (seq !== richiestaRef.current) {
        return;
      }
      setCandidati(feed.candidati);
      setProposte(feed.proposte);
      setPosizione(0);
    } catch (err) {
      if (seq !== richiestaRef.current) {
        return;
      }
      // Con un errore il contenuto precedente resta a schermo (lo dice il
      // Banner): la schermata non sparisce per un ricarico fallito.
      setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      if (seq === richiestaRef.current) {
        setCaricamento(false);
      }
    }
  }, [token, utenteId]);

  // Si ricaricano le schede quando la schermata torna in primo piano: le scelte
  // fatte altrove (o in un'altra finestra) devono valere anche qui.
  useFocusEffect(
    useCallback(() => {
      void carica();
      return () => {
        // Fuori dal focus la risposta in volo non deve applicarsi alla UI.
        richiestaRef.current += 1;
      };
    }, [carica]),
  );

  /**
   * Registra una scelta sulla scheda corrente (`SCELTE_CANDIDATO`): è la forma
   * interna, il layer la converte nella `direction` del contratto.
   */
  const scegli = useCallback(
    async (scelta) => {
      const candidato = candidati?.[posizione] ?? null;
      if (!candidato || azioneRef.current) {
        return;
      }
      // Senza i quattro id dei servizi non c'è una scelta da registrare: la UI
      // disabilita gesto e pulsanti, questa è la seconda rete (il feed non manda
      // schede senza id, ma una scheda non deve mai mandare `undefined`).
      if (!candidato.idServizi) {
        return;
      }

      azioneRef.current = true;
      setSceltaInCorso(scelta);
      setEsito(null);
      setErrore(null);
      try {
        const risposta = await registraScelta(token, { scelta, idServizi: candidato.idServizi });
        setEsito(
          aEsito(scelta, candidato.persona, candidato.offerta.mansione.trim(), risposta),
        );
        setPosizione((indice) => indice + 1);
      } catch (err) {
        const messaggio = err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.';
        setErrore(messaggio);
        if (err instanceof ApiError && err.status === 409) {
          // La coppia ha già una decisione: la scheda è vecchia e non deve
          // bloccare la pila. Salta, e col prossimo caricamento non c'è più.
          setPosizione((indice) => indice + 1);
        } else {
          // La scelta non è avvenuta: la scheda resta quella.
          setRipristino((numero) => numero + 1);
        }
      } finally {
        azioneRef.current = false;
        setSceltaInCorso(null);
      }
    },
    [candidati, posizione, token],
  );

  /**
   * La decisione su una proposta in attesa (`DECISIONI_PROPOSTA`): accettata o
   * rifiutata, la proposta esce dalla lista perché ha il suo esito.
   */
  const decidi = useCallback(
    async (id, decisione) => {
      const proposta = proposte?.find((voce) => voce.id === id) ?? null;
      if (!proposta || azioneRef.current) {
        return;
      }

      azioneRef.current = true;
      setDecisioneInCorso({ id, decisione });
      setEsito(null);
      setErrore(null);
      try {
        const risposta = await decidiProposta(token, id, decisione);
        setProposte((attuali) => (attuali ?? []).filter((voce) => voce.id !== id));
        setEsito(aEsito(decisione, proposta.persona, proposta.servizio.mansione.trim(), risposta));
      } catch (err) {
        setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
        if (err instanceof ApiError && (err.status === 404 || err.status === 409)) {
          // La proposta non c'è più o è già decisa: la riga è vecchia come la
          // scheda del 409, e resta a schermo solo l'esito sbagliato.
          setProposte((attuali) => (attuali ?? []).filter((voce) => voce.id !== id));
        }
      } finally {
        azioneRef.current = false;
        setDecisioneInCorso(null);
      }
    },
    [proposte, token],
  );

  /** Le due righe «Accetta»/«Rifiuta» di una proposta in attesa. */
  const accetta = useCallback((id) => decidi(id, DECISIONI_PROPOSTA.ACCETTA), [decidi]);
  const rifiuta = useCallback((id) => decidi(id, DECISIONI_PROPOSTA.RIFIUTA), [decidi]);

  /** Il pulsante «Ricarica» (e «Riprova» a pila finita): chiede un feed nuovo. */
  const ricarica = useCallback(async () => {
    setEsito(null);
    await carica();
  }, [carica]);

  const { refreshing, onRefresh } = useAggiornamento(ricarica);

  const totale = candidati?.length ?? 0;
  const candidato = candidati?.[posizione] ?? null;

  return {
    candidato,
    // 1-based per la UI («2 di 7»): l'indice interno resta 0-based. **Non** è
    // limitato al totale: mentre la pila carica vale 1, e non 0, così il numero
    // non cambia da solo quando i candidati arrivano (chi osserva la posizione
    // per riportare il focus non deve vedere un avanzamento che non c'è stato).
    numeroScheda: posizione + 1,
    totale,
    // «Non ci sono altre persone» e «hai visto tutte» sono due stati diversi e
    // due testi diversi: la differenza è se la pila è nata vuota o si è esaurita.
    pilaVuota: candidati !== null && totale === 0,
    pilaFinita: candidati !== null && totale > 0 && posizione >= totale,
    primoCaricamento: candidati === null,
    // Le proposte in attesa della mia decisione: `[]` finché il feed non arriva,
    // e la schermata mostra il testo vuoto solo dopo il primo caricamento.
    proposte: proposte ?? [],
    caricamento,
    errore,
    esito,
    sceltaInCorso,
    decisioneInCorso,
    ripristino,
    scegli,
    accetta,
    rifiuta,
    riprova: carica,
    ricarica,
    refreshing,
    onRefresh,
  };
}

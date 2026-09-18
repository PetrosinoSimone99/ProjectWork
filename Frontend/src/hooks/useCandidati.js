import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/api/client';
import { ottieniCandidati, registraSceltaCandidato } from '@/api/barattolo';
import { useAggiornamento } from '@/hooks/useAggiornamento';

/**
 * La macchina a stati della pila di «Loop»: i candidati, la posizione, la scelta
 * in volo e l'esito. È l'unico posto in cui la schermata parla con il layer API.
 *
 * Esiste per lo stesso motivo di `useCatalogoServizi`: la parte delicata — il
 * doppio invio, l'avanzamento, il fatto che l'elenco ricevuto sia già la verità
 * e non una copia locale — sta in un posto solo, e chi disegna la scheda non può
 * disattivarla per distrazione.
 *
 * Quattro cose che sembrano dettagli e non lo sono:
 *
 * 1. **La pila è solo l'array ricevuto.** Le scelte già fatte le esclude il
 *    backend (il finto fa lo stesso), quindi non esiste una seconda pila locale:
 *    una scheda passata non torna per costruzione.
 * 2. **`sceltaInCorso` è una guardia in un punto solo.** `sceltaRef` è sincrono
 *    (lo stato di React non lo è): una seconda scelta parte solo se la prima è
 *    finita, e il valore tiene anche traccia di *quale* scelta è in volo, così
 *    lo spinner compare sul pulsante giusto.
 * 3. **Un errore non fa avanzare.** La scheda resta quella e `ripristino` cambia:
 *    è il segnale che riporta la scheda al centro (dopo un gesto oltre soglia
 *    che non è andato a buon fine).
 * 4. **`posizione` si azzera a ogni ricarica**, perché l'elenco che arriva è
 *    già senza le schede scelte: ripartire dall'indice 0 è la cosa giusta, non
 *    un salto indietro.
 */
export function useCandidati({ token, utenteId }) {
  const [candidati, setCandidati] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [posizione, setPosizione] = useState(0);
  const [sceltaInCorso, setSceltaInCorso] = useState(null);
  const [esito, setEsito] = useState(null);
  const [ripristino, setRipristino] = useState(0);

  // Le richieste di caricamento in volo: una risposta si applica solo se nessuna
  // richiesta più recente è già partita (e il pull-to-refresh non litiga con il
  // ritorno sulla scheda).
  const richiestaRef = useRef(0);

  // Guardia sincrona sulla scelta: lo stato di React non ferma due tocchi rapidi.
  const sceltaRef = useRef(false);

  const carica = useCallback(async () => {
    if (!token || utenteId === null || utenteId === undefined) {
      return;
    }
    const seq = ++richiestaRef.current;
    setCaricamento(true);
    setErrore(null);
    try {
      const elenco = await ottieniCandidati(token, utenteId);
      if (seq !== richiestaRef.current) {
        return;
      }
      setCandidati(elenco);
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

  // Si ricaricano le schede quando la scheda torna in primo piano: le scelte
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
   * Registra una scelta sulla scheda corrente. La scelta è `SCELTE_CANDIDATO`,
   * cioè quello che il backend si aspetta di ricevere.
   */
  const scegli = useCallback(
    async (scelta) => {
      const candidato = candidati?.[posizione] ?? null;
      if (!candidato || sceltaRef.current) {
        return;
      }
      // Senza l'id dell'offerta non c'è una scelta da registrare: la UI
      // disabilita gesto e pulsanti, questa è la seconda rete.
      if (!Number.isInteger(candidato.offerta?.id)) {
        return;
      }

      sceltaRef.current = true;
      setSceltaInCorso(scelta);
      setEsito(null);
      setErrore(null);
      try {
        const risultato = await registraSceltaCandidato(
          token,
          utenteId,
          candidato.persona.id,
          candidato.offerta.id,
          scelta,
        );
        setEsito({
          scelta,
          match: risultato.match,
          persona: candidato.persona,
          mansione: candidato.offerta.mansione.trim(),
        });
        setPosizione((indice) => indice + 1);
      } catch (err) {
        // La scheda resta quella: la scelta non è avvenuta e non si avanza.
        setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
        setRipristino((numero) => numero + 1);
      } finally {
        sceltaRef.current = false;
        setSceltaInCorso(null);
      }
    },
    [candidati, posizione, token, utenteId],
  );

  /** Il pulsante «Ricarica» (e «Riprova» a pila finita): chiede una pila nuova. */
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
    caricamento,
    errore,
    esito,
    sceltaInCorso,
    ripristino,
    scegli,
    riprova: carica,
    ricarica,
    refreshing,
    onRefresh,
  };
}

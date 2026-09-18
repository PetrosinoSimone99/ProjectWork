import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/api/client';
import { esciDallaCoda, ottieniCoda } from '@/api/barattolo';
import { useAggiornamento } from '@/hooks/useAggiornamento';
import { statoVista } from '@/servizi/coda';

/**
 * La macchina a stati della catena: le letture, l'unica azione (`esci`) e la
 * vista da disegnare. È l'unico posto in cui la schermata parla con il layer API.
 *
 * Esiste per lo stesso motivo di `useCandidati` e `useCatalogoServizi`: la parte
 * delicata — il doppio invio, la rilettura dopo un'azione, la richiesta di
 * aggiornamento quando il tempo scade — sta in un posto solo, e chi disegna non
 * può disattivarla per distrazione.
 *
 * Quattro cose che sembrano dettagli e non lo sono:
 *
 * 1. **Il frontend non decide esiti.** `vista` è `statoVista(dati)`: legge
 *    `in_coda` e `gruppo.stato` e non deduce mai «probabilmente è in
 *    formazione». Un tempo scaduto **non** scrive «ricerca annullata»: chiede.
 * 2. **`azioneInCorso` è una guardia in un punto solo.** `azioneRef` è sincrono
 *    (lo stato di React non lo è): un secondo tocco su «Esci» non parte.
 * 3. **Un errore di `esci` rilegge.** Il `409` («la ricerca è già finita») è il
 *    caso in cui lo stato vero può essere diverso da quello a schermo: dopo la
 *    rilettura si mostra il messaggio del backend.
 * 4. **`chiediAggiornamento` parte una volta sola per scadenza.** Il residuo che
 *    arriva a zero fa **una** rilettura; se il backend risponde ancora «in
 *    ricerca», non si riparte in ciclo. Il contatore si riarma quando arriva una
 *    scadenza diversa.
 */
export function useCoda({ token, utenteId }) {
  const [dati, setDati] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(false);

  // Le richieste in volo: una risposta si applica solo se nessuna più recente è
  // già partita (il pull-to-refresh non litiga con il ritorno sulla schermata).
  const richiestaRef = useRef(0);
  // Guardia sincrona su «Esci»: lo stato di React non ferma due tocchi rapidi.
  const azioneRef = useRef(false);
  // La rilettura per scadenza raggiunta: una sola per scadenza.
  const aggiornamentoChiestoRef = useRef(false);
  const scadenzaVistaRef = useRef(undefined);

  const carica = useCallback(async () => {
    if (!token || utenteId === null || utenteId === undefined) {
      return;
    }
    const seq = ++richiestaRef.current;
    setCaricamento(true);
    try {
      const risultato = await ottieniCoda(token, utenteId);
      if (seq !== richiestaRef.current) {
        return;
      }
      setDati(risultato);
      setErrore(null);
    } catch (err) {
      if (seq !== richiestaRef.current) {
        return;
      }
      // Il contenuto precedente resta a schermo: la schermata non sparisce per un
      // ricarico fallito.
      setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      if (seq === richiestaRef.current) {
        setCaricamento(false);
      }
    }
  }, [token, utenteId]);

  // Si rilegge quando la scheda torna in primo piano, come le altre schermate:
  // la catena può essersi chiusa o saltata stando altrove.
  useFocusEffect(
    useCallback(() => {
      void carica();
      return () => {
        richiestaRef.current += 1;
      };
    }, [carica]),
  );

  // Una scadenza nuova (o la sua assenza) riarma la richiesta di aggiornamento.
  useEffect(() => {
    const nuova = dati?.scadenzaMs ?? null;
    if (nuova !== scadenzaVistaRef.current) {
      scadenzaVistaRef.current = nuova;
      aggiornamentoChiestoRef.current = false;
    }
  }, [dati?.scadenzaMs]);

  /**
   * «Esci dalla ricerca» e «Esci dal gruppo»: la stessa azione, perché per il
   * backend è la stessa cosa. Restituisce `true` se è andata a buon fine.
   */
  const esci = useCallback(async () => {
    if (azioneRef.current) {
      return false;
    }
    azioneRef.current = true;
    setAzioneInCorso(true);
    try {
      await esciDallaCoda(token, utenteId);
      await carica();
      return true;
    } catch (err) {
      const messaggio = err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.';
      // Lo stato vero può essere diverso da quello a schermo: prima si rilegge,
      // poi si mostra il messaggio dell'azione fallita.
      await carica();
      setErrore(messaggio);
      return false;
    } finally {
      azioneRef.current = false;
      setAzioneInCorso(false);
    }
  }, [token, utenteId, carica]);

  /**
   * Il tempo è arrivato a zero: si **chiede** lo stato vero, non si dichiara un
   * esito. Una sola richiesta per scadenza (vedi sopra).
   */
  const chiediAggiornamento = useCallback(() => {
    if (aggiornamentoChiestoRef.current) {
      return;
    }
    aggiornamentoChiestoRef.current = true;
    void carica();
  }, [carica]);

  const { refreshing, onRefresh } = useAggiornamento(carica);

  return {
    dati,
    vista: statoVista(dati),
    caricamento,
    errore,
    azioneInCorso,
    primoCaricamento: dati === null && !errore,
    ricarica: carica,
    esci,
    chiediAggiornamento,
    refreshing,
    onRefresh,
  };
}

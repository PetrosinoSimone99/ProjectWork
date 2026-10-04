import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/api/client';
import {
  annullaCatena as annullaCatenaNelLayer,
  avviaRicercaCatena,
  confermaRicezione as confermaRicezioneNelLayer,
  decidiCatena as decidiCatenaNelLayer,
  decidiCondizioni as decidiCondizioniNelLayer,
  isErroreMatchDiretto,
  ottieniBuoniCompensazione,
  ottieniCatene,
  proponiCondizioni as proponiCondizioniNelLayer,
} from '@/api/aree/catene';
import { useAggiornamento } from '@/hooks/useAggiornamento';

/**
 * La macchina a stati di «Scambi»: le letture (catene **e** buoni, in due rami
 * indipendenti) e le sei azioni del ciclo di vita. È l'unico posto in cui la
 * schermata parla con il layer API.
 *
 * Esiste per lo stesso motivo di `useCandidati` e `useCatalogoServizi`: la parte
 * delicata — il doppio invio, la rilettura dopo un'azione, la richiesta di
 * aggiornamento quando una scadenza tocca lo zero — sta in un posto solo, e chi
 * disegna non può disattivarla per distrazione.
 *
 * Cinque cose che sembrano dettagli e non lo sono:
 *
 * 1. **Due letture indipendenti.** Catene e buoni arrivano da due endpoint
 *    diversi: un ramo fallito non fa fallire l'altro, e ognuno ha il suo errore
 *    e il suo «Riprova» (`errore` per le catene, `erroreBuoni` per i buoni).
 * 2. **Il frontend non decide esiti.** Una scadenza toccata allo zero fa
 *    **una** rilettura (`chiediAggiornamento`); se il backend risponde ancora
 *    «in ricerca», non si riparte in ciclo. La scadenza si riarma quando torna
 *    un valore diverso.
 * 3. **`azioneInCorso` è una guardia sincrona per riga.** `azioneRef` conserva
 *    la chiave dell'azione in volo (`tipo·idCatena·idRiga`): la stessa riga non
 *    parte due volte, ma azioni su righe diverse restano possibili, come chiede
 *    il piano (una lista di card, non «la» catena).
 * 4. **Un errore rilegge prima di mostrarlo** (vincolo 7 del piano): il `409`
 *    da concorrenza è retryabile per contratto, e in generale lo stato vero può
 *    essere diverso da quello a schermo. I form mantengono i valori: il
 *    messaggio arriva in `errore`, i dati non si toccano.
 * 5. **`matchDiretto` è un flag, non un testo da indovinare.** Il `409`
 *    «c'è un match diretto» dell'avvio arriva dal layer con il suo messaggio; il
 *    flag dice alla schermata di mostrare il pulsante «Vai al Loop» accanto.
 */
export function useCatene({ token, utenteId }) {
  const [catene, setCatene] = useState(null);
  const [buoni, setBuoni] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [erroreBuoni, setErroreBuoni] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(null);
  const [matchDiretto, setMatchDiretto] = useState(false);

  // Le richieste in volo: una risposta si applica solo se nessuna più recente è
  // già partita (il pull-to-refresh non litiga con il ritorno sulla schermata).
  const richiestaRef = useRef(0);
  // Guardia sincrona sulle azioni: la chiave «tipo·idCatena·idRiga» in volo.
  const azioneRef = useRef(null);
  // Le scadenze per cui la rilettura è già stata chiesta: una sola per valore.
  const scadenzeChiesteRef = useRef(new Set());

  const leggeBuoni = useCallback(async () => {
    try {
      const elenco = await ottieniBuoniCompensazione(token);
      setBuoni(elenco);
      setErroreBuoni(null);
    } catch (err) {
      setErroreBuoni(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    }
  }, [token]);

  /**
   * La lettura completa: catene e buoni in parallelo, rami indipendenti. Le
   * catene hanno il loro errore (`errore`), i buoni il loro (`erroreBuoni`):
   * `Promise.allSettled` non serve, perché ogni ramo gestisce da sé il suo
   * fallimento.
   */
  const carica = useCallback(async () => {
    if (!token || utenteId === null || utenteId === undefined) {
      // Senza sessione niente "caricamento eterno": liste vuote esplicite, così
      // la schermata mostra i suoi stati vuoti (la route comunque non è
      // raggiungibile dal ramo autenticato).
      setCatene((precedente) => precedente ?? []);
      setBuoni((precedente) => precedente ?? []);
      return;
    }
    const seq = ++richiestaRef.current;
    setCaricamento(true);
    try {
      const [rispostaCatene] = await Promise.all([
        ottieniCatene(token, utenteId),
        leggeBuoni(),
      ]);
      if (seq !== richiestaRef.current) {
        return;
      }
      setCatene(rispostaCatene);
      setErrore(null);
    } catch (err) {
      if (seq !== richiestaRef.current) {
        return;
      }
      // Il contenuto precedente resta a schermo: la schermata non sparisce per
      // un ricarico fallito.
      setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      if (seq === richiestaRef.current) {
        setCaricamento(false);
      }
    }
  }, [token, utenteId, leggeBuoni]);

  // Si rilegge quando la scheda torna in primo piano: una ricerca può essersi
  // chiusa (o saltata) stando altrove, e i buoni possono essere arrivati.
  useFocusEffect(
    useCallback(() => {
      void carica();
      return () => {
        richiestaRef.current += 1;
      };
    }, [carica]),
  );

  /** La chiave sincrona di un'azione: la stessa riga non parte due volte. */
  const chiaveAzione = (tipo, idCatena, idRiga) => `${tipo}·${idCatena ?? ''}·${idRiga ?? ''}`;

  /**
   * Esegue un'azione con la guardia sincrona e la rilettura: in successo
   * rilegge (lo stato può essere cambiato anche per effetto dell'azione, come
   * la catena che passa a `COMPLETED`), in errore rilegge **prima** di mostrare
   * il messaggio (vincolo 7). Restituisce `true` se è andata a buon fine.
   */
  const eseguiAzione = useCallback(
    async (tipo, idCatena, idRiga, azione) => {
      const chiave = chiaveAzione(tipo, idCatena, idRiga);
      if (azioneRef.current === chiave) {
        return false;
      }
      azioneRef.current = chiave;
      setAzioneInCorso({ tipo, idCatena: idCatena ?? null, idRiga: idRiga ?? null });
      setErrore(null);
      setMatchDiretto(false);
      try {
        await azione();
        await carica();
        return true;
      } catch (err) {
        const messaggio = err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.';
        // Lo stato vero può essere diverso da quello a schermo: prima si rilegge,
        // poi si mostra il messaggio dell'azione fallita. I form mantengono i
        // valori: `errore` parla, i dati non si toccano.
        await carica();
        setErrore(messaggio);
        if (isErroreMatchDiretto(err)) {
          setMatchDiretto(true);
        }
        return false;
      } finally {
        if (azioneRef.current === chiave) {
          azioneRef.current = null;
          setAzioneInCorso(null);
        }
      }
    },
    [carica],
  );

  /** POST /api/chains con la coppia scelta: restituisce la catena creata (o trovata). */
  const avviaRicerca = useCallback(
    (coppia) =>
      eseguiAzione('avviaRicerca', null, null, () =>
        avviaRicercaCatena(token, utenteId, coppia),
      ),
    [eseguiAzione, token, utenteId],
  );

  /** POST /api/chains/{id}/decision — la mia conferma o il mio rifiuto del ciclo. */
  const decidi = useCallback(
    (idCatena, decisione) =>
      eseguiAzione('decidi', idCatena, null, () =>
        decidiCatenaNelLayer(token, utenteId, idCatena, decisione),
      ),
    [eseguiAzione, token, utenteId],
  );

  /** POST /api/chains/{id}/agreements — proponi le condizioni di un arco. */
  const proponiCondizioni = useCallback(
    (idCatena, payload) =>
      eseguiAzione('proponiCondizioni', idCatena, null, () =>
        proponiCondizioniNelLayer(token, utenteId, idCatena, payload),
      ),
    [eseguiAzione, token, utenteId],
  );

  /** POST /api/chains/{id}/agreements/{agreementId}/decision — accetta/rifiuta condizioni. */
  const decidiCondizioni = useCallback(
    (idCatena, idCondizioni, decisione) =>
      eseguiAzione('decidiCondizioni', idCatena, idCondizioni, () =>
        decidiCondizioniNelLayer(token, utenteId, idCatena, idCondizioni, decisione),
      ),
    [eseguiAzione, token, utenteId],
  );

  /** POST /api/chains/{id}/provisions/{provisionId}/receipt — conferma la ricezione. */
  const confermaRicezione = useCallback(
    (idCatena, idPrestazione) =>
      eseguiAzione('confermaRicezione', idCatena, idPrestazione, () =>
        confermaRicezioneNelLayer(token, utenteId, idCatena, idPrestazione),
      ),
    [eseguiAzione, token, utenteId],
  );

  /** POST /api/chains/{id}/cancel — annulla con motivo obbligatorio (1–255). */
  const annulla = useCallback(
    (idCatena, motivo) =>
      eseguiAzione('annulla', idCatena, null, () =>
        annullaCatenaNelLayer(token, utenteId, idCatena, motivo),
      ),
    [eseguiAzione, token, utenteId],
  );

  /** Ricarica **solo** i buoni: il loro «Riprova» è indipendente dal resto. */
  const ricaricaBuoni = useCallback(() => {
    if (!token) {
      return Promise.resolve(false);
    }
    return leggeBuoni().then(() => true);
  }, [leggeBuoni, token]);

  /**
   * Una scadenza è arrivata a zero: si **chiede** lo stato vero, una volta sola
   * per valore di scadenza (vincolo 5 del piano). Se il backend risponde ancora
   * «in ricerca», non si riparte: la scadenza è già nel set.
   */
  const chiediAggiornamento = useCallback(
    (scadenzaMs) => {
      if (scadenzaMs === null || scadenzaMs === undefined) {
        return;
      }
      if (scadenzeChiesteRef.current.has(scadenzaMs)) {
        return;
      }
      scadenzeChiesteRef.current.add(scadenzaMs);
      void carica();
    },
    [carica],
  );

  const { refreshing, onRefresh } = useAggiornamento(carica);

  return {
    catene,
    buoni,
    caricamento,
    errore,
    erroreBuoni,
    azioneInCorso,
    matchDiretto,
    primoCaricamento: catene === null && errore === null,
    ricarica: carica,
    ricaricaBuoni,
    avviaRicerca,
    decidi,
    proponiCondizioni,
    decidiCondizioni,
    confermaRicezione,
    annulla,
    chiediAggiornamento,
    refreshing,
    onRefresh,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError } from '@/api/client';
import { ottieniNotifiche, segnaNotificaLetta } from '@/api/barattolo';
import { notificheNonLette } from '@/servizi/notifiche';

/**
 * Le notifiche in-app: la lettura delle proprie, all'apertura dell'app e al
 * ritorno in primo piano.
 *
 * È l'unica rete dell'avviso, e sta qui per lo stesso motivo di `useChat`: le
 * cose delicate — la guardia sulle risposte arrivate dopo, la chiusura che non
 * resta appesa a una rete lenta — non devono dipendere da come è disegnata la
 * scheda. La decisione «quale notifica mostrare» è una riga di dominio
 * (`notificheNonLette`, in `servizi/notifiche.js`), non una regola del componente.
 *
 * Tre cose dichiarate:
 * - **un avviso non blocca l'app**: se la lettura fallisce si scrive il motivo in
 *   console e non si mostra niente. Un errore ambientale ripetuto su ogni
 *   schermata sarebbe peggio del silenzio, e la notifica non è una pratica che
 *   l'utente deve poter fare: è un avviso, e riapparirà alla prossima lettura
 *   riuscita (con i finti spenti `notifiche.php` non esiste: il ramo vero è in
 *   `api/barattolo.js` e porta il suo `// TODO(backend)`);
 * - **`AppState` e non un polling**: qui non c'è niente da inseguire, come in
 *   chat; la lista si rilegge quando l'app torna davanti all'utente;
 * - **la chiusura è ottimistica**: la scheda sparisce subito e la scrittura va
 *   dopo. Se fallisce, la notifica resta non letta nel deposito e ricompare alla
 *   lettura successiva — non si perde niente.
 */
export function useNotifiche({ token, utenteId }) {
  const [notifiche, setNotifiche] = useState([]);
  const [inChiusura, setInChiusura] = useState(false);

  // La richiesta in volo: una risposta si applica solo se nessuna più recente è
  // già partita (l'apertura può sovrapporsi al ritorno in primo piano).
  const richiestaRef = useRef(0);
  const montatoRef = useRef(true);

  useEffect(() => {
    montatoRef.current = true;
    return () => {
      montatoRef.current = false;
      richiestaRef.current += 1;
    };
  }, []);

  const aggiorna = useCallback(async () => {
    if (!token || utenteId === null || utenteId === undefined) {
      return;
    }
    const seq = ++richiestaRef.current;
    try {
      const elenco = await ottieniNotifiche(token, utenteId);
      if (seq !== richiestaRef.current || !montatoRef.current) {
        return;
      }
      setNotifiche(elenco);
    } catch (err) {
      if (seq !== richiestaRef.current) {
        return;
      }
      const motivo = err instanceof ApiError ? err.message : 'Errore imprevisto.';
      console.warn('Non riesco a leggere le notifiche:', motivo);
    }
  }, [token, utenteId]);

  // All'apertura della shell si legge subito. Il primo giro passa da un
  // `setTimeout` e non da una scrittura sincrona nell'effetto, come
  // `useScadenzaSessione`: così non ci sono render a cascata sull'appena montato.
  useEffect(() => {
    const immediato = setTimeout(() => {
      void aggiorna();
    }, 0);
    return () => clearTimeout(immediato);
  }, [aggiorna]);

  // Al ritorno in primo piano si rilegge: è il momento in cui un esito può essere
  // arrivato mentre l'app era in background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (stato) => {
      if (stato === 'active') {
        void aggiorna();
      }
    });
    return () => subscription.remove();
  }, [aggiorna]);

  /** Chiude l'avviso: lo toglie a schermo e segna la notifica come letta. */
  const chiudi = useCallback(
    async (notifica) => {
      if (!notifica || inChiusura) {
        return;
      }
      setInChiusura(true);
      setNotifiche((precedenti) =>
        precedenti.filter((altra) => Number(altra.id) !== Number(notifica.id)),
      );
      try {
        await segnaNotificaLetta(token, utenteId, notifica.id);
      } catch (err) {
        const motivo = err instanceof ApiError ? err.message : 'Errore imprevisto.';
        console.warn('Non riesco a segnare la notifica come letta:', motivo);
      } finally {
        if (montatoRef.current) {
          setInChiusura(false);
        }
      }
    },
    [inChiusura, token, utenteId],
  );

  const nonLette = notificheNonLette(notifiche);
  return {
    notifiche,
    nonLette,
    // L'avviso mostra la più recente fra quelle non lette: le altre restano in
    // attesa e compaiono chiudendo questa, senza un secondo avviso in cima.
    notifica: nonLette[0] ?? null,
    inChiusura,
    chiudi,
  };
}

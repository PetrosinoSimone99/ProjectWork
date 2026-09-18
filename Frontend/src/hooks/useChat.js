import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError } from '@/api/client';
import { cercaOCreaChat, inviaMessaggio, ottieniStoricoChat } from '@/api/barattolo';

/** Ritmo del polling: 4 s, invariato dall'estrazione. */
const POLLING_INTERVAL_MS = 4000;

function getErrorMessage(error) {
  return error instanceof ApiError ? error.message : 'Errore imprevisto. Riprova.';
}

/**
 * La macchina di rete della chat 1:1: aprire la conversazione, tenerla aggiornata
 * e inviare. È l'unico posto in cui la schermata parla con il layer API.
 *
 * Esiste per lo stesso motivo di `useCandidati`: le cose delicate — la sequenza
 * «crea la chat, poi chiedi lo storico», il polling che non deve partire in
 * background, la guardia sul montaggio — stanno in un posto solo, e chi disegna
 * le bolle non può disattivarle per distrazione.
 *
 * Quattro cose che sembrano dettagli e non lo sono:
 *
 * 1. **Le due chiamate della prima apertura sono in sequenza** (`cercaOCreaChat`
 *    dà l'id, `ottieniStoricoChat` lo storico) e il `chatId` è valido solo se è
 *    un intero positivo: l'id della rotta è del destinatario, non della chat.
 * 2. **Il polling guarda `AppState` a ogni tick** invece di spegnersi e
 *    riaccendersi: costa pochissimo e non lascia finestre in cui il timer gira
 *    su un'app in background.
 * 3. **Al ritorno in primo piano ci si sincronizza subito**, senza aspettare il
 *    tick successivo (che può essere lontano fino a 4 s).
 * 4. **`mountedRef` è la guardia sulle scritture di stato**: un refresh in volo
 *    quando la schermata si smonta non deve finire su un componente che non c'è
 *    più (il logout da token scaduto può svuotare la chat mentre la risposta
 *    arriva).
 *
 * L'ora, il disegno delle bolle e lo scorrimento automatico **non** stanno qui:
 * sono decisioni dell'interfaccia. Per lo scorrimento il hook espone
 * `lastMessageId`, che è l'unico dato che serve per decidere se si è aggiunto
 * qualcosa in fondo.
 */
export function useChat({ token, utente, targetUserId, hasValidTarget }) {
  const mountedRef = useRef(true);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Prima apertura (e ogni «Riprova»): si riparte da zero, senza lo storico
  // della chat precedente. Il flag `cancelled` è locale all'effetto perché una
  // risposta arrivata dopo un nuovo tentativo non deve sovrascrivere quello
  // nuovo — `mountedRef` da sola non basta, la schermata è ancora montata.
  useEffect(() => {
    let cancelled = false;

    async function loadChat() {
      setChatId(null);
      setMessages([]);
      setError(null);

      if (!hasValidTarget) {
        setLoading(false);
        setError('Destinatario non valido. Riapri la chat dal dettaglio di un annuncio.');
        return;
      }
      if (!token || !utente) {
        setLoading(false);
        setError('Sessione non disponibile. Torna al login e riprova.');
        return;
      }

      setLoading(true);
      try {
        const nextChatId = await cercaOCreaChat(token, utente.id, targetUserId);
        if (cancelled) {
          return;
        }
        if (!Number.isInteger(nextChatId) || nextChatId <= 0) {
          throw new ApiError(200, 'Risposta non valida dal server della chat.');
        }

        const history = await ottieniStoricoChat(token, nextChatId);
        if (cancelled) {
          return;
        }
        if (!Array.isArray(history)) {
          throw new ApiError(200, 'Storico chat non valido.');
        }

        setChatId(nextChatId);
        setMessages(history);
      } catch (loadError) {
        if (!cancelled) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadChat();
    return () => {
      cancelled = true;
    };
  }, [hasValidTarget, retryCount, targetUserId, token, utente]);

  const refresh = useCallback(async () => {
    if (!token || chatId === null) {
      return;
    }

    try {
      const history = await ottieniStoricoChat(token, chatId);
      if (!Array.isArray(history)) {
        throw new ApiError(200, 'Storico chat non valido.');
      }
      if (mountedRef.current) {
        setMessages(history);
        setError(null);
      }
    } catch (refreshError) {
      if (mountedRef.current) {
        setError(getErrorMessage(refreshError));
      }
    }
  }, [chatId, token]);

  // Polling solo ad app visibile: in background o tab nascosta non si consuma
  // rete né batteria (uno sguardo a AppState a ogni tick costa pochissimo).
  useEffect(() => {
    if (chatId === null) {
      return undefined;
    }

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        void refresh();
      }
    }, POLLING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [chatId, refresh]);

  // Appena l'app torna in primo piano ci si sincronizza subito, senza aspettare
  // il prossimo tick del timer.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && chatId !== null) {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [chatId, refresh]);

  /**
   * Invia un messaggio e riallinea lo storico. Restituisce `true` solo quando il
   * messaggio è **partito davvero**: è il segnale con cui la schermata svuota il
   * campo di scrittura (l'unica parte dell'invio che appartiene all'interfaccia,
   * perché il testo digitato è suo).
   */
  const invia = useCallback(
    async (testo) => {
      const text = typeof testo === 'string' ? testo.trim() : '';
      if (!text || chatId === null || !token || !utente || sending) {
        return false;
      }

      setSending(true);
      setError(null);
      try {
        await inviaMessaggio(token, chatId, utente.id, text);
        if (!mountedRef.current) {
          return false;
        }
        await refresh();
        return true;
      } catch (sendError) {
        if (mountedRef.current) {
          setError(getErrorMessage(sendError));
        }
        return false;
      } finally {
        if (mountedRef.current) {
          setSending(false);
        }
      }
    },
    [chatId, refresh, sending, token, utente],
  );

  /** Il pulsante «Riprova» di un caricamento fallito: rifà la prima apertura. */
  const riprova = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  const lastMessageId =
    messages.length > 0 ? messages[messages.length - 1]?.id ?? null : null;

  return {
    chatId,
    messages,
    loading,
    error,
    sending,
    lastMessageId,
    invia,
    riprova,
  };
}

import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import {
  getAgreementChat,
  getMostRecentMessageId,
  getNewChatMessages,
  sendChatMessage,
} from '@/api';

/** How often the open chat asks the backend whether something arrived. */
export const CHAT_POLL_MS = 15000;

/** `console.warn` only where a developer can read it. */
function logInSviluppo(messaggio, dettaglio) {
  if (typeof __DEV__ === 'undefined' || __DEV__) {
    console.warn(messaggio, dettaglio);
  }
}

/**
 * The data layer of one agreement chat, following the `useAgreements` pattern:
 * the history, the poll, the send and their separate errors.
 *
 * Five things that look like details and are not:
 *
 * 1. **The chat id exists only after the first read.** `GET
 *    /chats/agreement/{agreementId}` creates the chat when it is missing
 *    (`ChatManager::getOrCreateChat`), so `chatId` is `null` until the history
 *    arrives and the composer stays locked until then: `send-message` takes a
 *    chat id, not an agreement id.
 * 2. **The poll is a cursor, not a diff.** `check-new-messages` is global across
 *    the user's chats and never carries the caller's own messages, so the hook
 *    asks `most-recent-message` for the newest received id, then filters the
 *    answer by `chatId`. When something for this chat is newer, the history is
 *    re-read instead of merged: the backend sends no row back on send, and one
 *    reader is cheaper than a merge that can duplicate a bubble.
 * 3. **The timer lives inside `useFocusEffect`.** Leaving the screen clears it,
 *    and no interval survives a blurred chat; there is no polling without a
 *    `chatId`, and no polling without a token.
 * 4. **A failed poll is not a failed screen**: it warns in development and
 *    leaves the messages already on screen alone.
 * 5. **Reading and writing fail apart** (`errore` and `erroreInvio`): a
 *    rejected message must not wipe a conversation.
 */
export function useChat({ token, agreementId }) {
  const [chatId, setChatId] = useState(null);
  const [messaggi, setMessaggi] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [inviando, setInviando] = useState(false);
  const [erroreInvio, setErroreInvio] = useState(null);

  // Incremented on every read and on blur: a response that arrives after a
  // newer request (or after leaving the screen) is stale and ignored.
  const requestSeqRef = useRef(0);

  const carica = useCallback(async () => {
    if (!token || !Number.isInteger(agreementId)) {
      return;
    }
    const seq = ++requestSeqRef.current;
    setCaricamento(true);
    setErrore(null);
    try {
      const storico = await getAgreementChat(token, agreementId);
      if (seq !== requestSeqRef.current) {
        return; // superseded: the screen keeps what it already shows.
      }
      setChatId(storico.chatId);
      setMessaggi(storico.messaggi);
    } catch (err) {
      if (seq !== requestSeqRef.current) {
        return;
      }
      setErrore(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      if (seq === requestSeqRef.current) {
        setCaricamento(false);
      }
    }
  }, [token, agreementId]);

  // The screen asks on every return to the foreground, and invalidates the
  // response in flight when it leaves.
  useFocusEffect(
    useCallback(() => {
      void carica();
      return () => {
        requestSeqRef.current += 1;
      };
    }, [carica]),
  );

  const sonda = useCallback(async () => {
    if (!token || chatId === null) {
      return;
    }
    try {
      const cursore = await getMostRecentMessageId(token);
      if (cursore === null) {
        return; // nothing was ever received: no cursor to ask beyond.
      }
      const nuovi = await getNewChatMessages(token, cursore);
      if (nuovi.some((messaggio) => messaggio.chatId === chatId)) {
        await carica();
      }
    } catch (err) {
      logInSviluppo('[chat] controllo dei nuovi messaggi non riuscito', err?.message ?? err);
    }
  }, [token, chatId, carica]);

  useFocusEffect(
    useCallback(() => {
      if (!token || chatId === null) {
        return undefined;
      }
      const timer = setInterval(() => {
        void sonda();
      }, CHAT_POLL_MS);
      return () => clearInterval(timer);
    }, [token, chatId, sonda]),
  );

  /** Sends one message: `true` when it landed, `false` when the POST failed. */
  const invia = useCallback(
    async (testo) => {
      const pulito = typeof testo === 'string' ? testo.trim() : '';
      if (!token || chatId === null || pulito === '') {
        return false;
      }
      setInviando(true);
      setErroreInvio(null);
      try {
        await sendChatMessage(token, chatId, pulito);
        await carica();
        return true;
      } catch (err) {
        setErroreInvio(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
        return false;
      } finally {
        setInviando(false);
      }
    },
    [token, chatId, carica],
  );

  return { chatId, messaggi, caricamento, errore, inviando, erroreInvio, invia, ricarica: carica };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { affectsChat } from '@/api/stream';
import { useStreamEvent } from '@/hooks/useEventStream';
import {
  getAgreementChat,
  getMostRecentMessageId,
  getNewChatMessages,
  MESSAGE_MAX_LENGTH,
  MESSAGE_TOO_LONG,
  sendChatMessage,
} from '@/api/areas/chat';

/**
 * How often the open chat asks the backend whether something arrived **when the
 * stream is not delivering**. The frame is the live path; this is the fallback
 * for a dropped connection, so it costs a request a minute, not four.
 */
export const CHAT_POLL_MS = 60000;

/** Consecutive failed polls before the screen is told something is wrong. */
const GUASTI_PRIMA_DEL_BANNER = 2;

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
 * 2. **The poll carries its own cursor.** `check-new-messages` answers the
 *    messages **newer than the id it is given** (`cm.id > :recentMessageId`,
 *    `ChatMessageRepository.php:44`) across every chat of the user, and never
 *    the caller's own. The cursor is therefore the highest id the screen
 *    already shows — asking `most-recent-message` on every tick would hand the
 *    route the very id that makes its answer empty. That call is used **once**,
 *    to seed an empty chat, where there is no displayed id to start from.
 * 3. **The frame is the live path; the timer is the fallback.** A
 *    `CHAT_MESSAGE` notification for this chat runs the very `sonda` the timer
 *    runs, so the message lands on the next frame instead of on the next tick.
 *    The timer only covers a stream that is down (`php -S` dropping it, the
 *    incremental XHR read on native), and it lives inside `useFocusEffect`:
 *    leaving the screen clears it, and there is no poll without a `chatId` or
 *    without a token.
 * 4. **A single failed poll is noise, not an error**: it warns in development
 *    and keeps the messages on screen. Two in a row reach `errore`, because a
 *    chat that quietly stops updating is worse than one that says so
 *    (`AGENTS.md`: never silently swallow an error).
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
  // Highest message id this screen knows about; `null` until it has one.
  const cursoreRef = useRef(null);
  const guastiRef = useRef(0);

  // Another agreement means another conversation: the cursor starts over.
  useEffect(() => {
    cursoreRef.current = null;
    guastiRef.current = 0;
  }, [agreementId]);

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
      guastiRef.current = 0;
      if (storico.messaggi.length > 0) {
        cursoreRef.current = Math.max(...storico.messaggi.map((messaggio) => messaggio.id));
      } else if (cursoreRef.current === null) {
        // An empty chat has no displayed id to ask beyond: the newest received
        // message of any chat is where the next poll starts.
        const seme = await getMostRecentMessageId(token);
        if (seq === requestSeqRef.current) {
          cursoreRef.current = seme ?? 0;
        }
      }
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
      if (cursoreRef.current === null) {
        // The seed call of the first read failed: take it now instead of
        // never polling at all.
        cursoreRef.current = (await getMostRecentMessageId(token)) ?? 0;
      }
      const nuovi = await getNewChatMessages(token, cursoreRef.current);
      guastiRef.current = 0;
      const diQuestaChat = nuovi.filter((messaggio) => messaggio.chatId === chatId);
      if (diQuestaChat.length === 0) {
        return;
      }
      // Advance before reading again: if the read fails, the next tick must not
      // hand the same id back and re-ask forever.
      cursoreRef.current = Math.max(cursoreRef.current, ...nuovi.map((messaggio) => messaggio.id));
      await carica();
    } catch (err) {
      guastiRef.current += 1;
      logInSviluppo('[chat] controllo dei nuovi messaggi non riuscito', err?.message ?? err);
      if (guastiRef.current >= GUASTI_PRIMA_DEL_BANNER) {
        setErrore(GENERIC_ERROR_MESSAGE);
      }
    }
  }, [token, chatId, carica]);

  // The guard is inside the handler, not around the subscription: `chatId` is
  // `null` until the first read answers, and the hook cannot be called
  // conditionally. Same `sonda` as the timer: the cursor stays the one source.
  useStreamEvent(
    useCallback(
      (notifica) => {
        if (!token || chatId === null) {
          return;
        }
        if (affectsChat(notifica, chatId)) {
          void sonda();
        }
      },
      [token, chatId, sonda],
    ),
  );

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

  /** Sends one message: `true` when it landed, `false` when it did not. */
  const invia = useCallback(
    async (testo) => {
      const pulito = typeof testo === 'string' ? testo.trim() : '';
      if (!token || chatId === null || pulito === '') {
        return false;
      }
      // The cap again, at the boundary: the composer is one caller, not the only
      // one, and the backend validates nothing (`ChatMessage` has no constraint).
      if (pulito.length > MESSAGE_MAX_LENGTH) {
        setErroreInvio(MESSAGE_TOO_LONG);
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

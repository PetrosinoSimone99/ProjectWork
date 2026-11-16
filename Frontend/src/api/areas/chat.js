import { ApiError, apiFetch } from '../client';
import {
  normalizeChatHistory,
  normalizeChatMessage,
  toIntegerOrNull,
} from '../normalizers';

/**
 * Chat area: the four routes `ChatController` exposes today
 * (`Backend/src/Controller/ChatController.php`):
 *
 * - `GET /chats/agreement/{agreementId}` answers `{chatId, messages}`. The
 *   chat is **created when it does not exist yet** (`ChatManager::
 *   getOrCreateChat`), so the first read of an accepted agreement also creates
 *   it, and an empty `messages` is a new conversation, not an error.
 * - `POST /chats/send-message/{chatId}` with `{message}` answers
 *   `{success: {code: 200, message: 'Message sent successfully'}}`: only the
 *   acknowledgement, **never the row just written** — no id comes back, so no
 *   optimistic bubble can be reconciled and the screen re-reads the history
 *   after the `200`.
 * - `GET /chats/most-recent-message` answers `{chatMessageId}`: the id of the
 *   newest message the user received, `null` when there is none — the cursor
 *   of the next polling call.
 * - `GET /chats/check-new-messages/{recentMessageId}` answers an **array**.
 *   The route is **global**: it carries the new messages of every chat of the
 *   user, not of one agreement, so the caller filters by `chatId`; and it
 *   never includes the user's own messages (`cm.user != :user`), which only
 *   appear at the next full history read.
 *
 * The backend writes `{error: ...}` in English. The two calls the screen
 * drives translate the statuses they can hit into Italian here, with the
 * `MESSAGES` + `withMessage` pattern of `areas/agreements.js`, so no screen
 * maps a status and no English text reaches the UI. `401` is deliberately left
 * to `client.js`, which owns the expired session and its sentence; the polling
 * calls keep the generic Italian statuses of `client.js` for the same reason.
 */

/**
 * The cap on one message, and the sentence when a caller ignores it.
 *
 * It is **ours**: `Backend/src/Entity/ChatMessage.php` has no constraint and the
 * column is `text`, so the server would store a 5000-character message. The
 * composer caps the field; the hook re-checks before the POST, because the
 * composer is not the only possible caller.
 */
export const MESSAGE_MAX_LENGTH = 1000;

/** The refusal the screen shows when a caller sends more than the cap. */
export const MESSAGE_TOO_LONG = 'Il messaggio è troppo lungo (massimo 1000 caratteri).';

/** Italian copy for the statuses the history and send calls can answer. */
const MESSAGES = {
  /**
   * Reading the history: `400` is the agreement id the backend refused
   * (`Invalid chat`), `500` a read that failed; `404` is the sentence for an
   * agreement that no longer exists.
   */
  history: {
    400: "Non posso aprire questa chat: manca un dato dell'accordo.",
    404: 'Non trovo più questo accordo: potrebbe essere stato cancellato.',
    500: "Il server non ha restituito la chat: riprova. E se l'errore resta segnalalo.",
  },
  /**
   * Sending: `400` is the body or the chat the backend refused (`Invalid
   * JSON`/`Invalid chat`/`Invalid message`), `500` a write that failed; `404`
   * is the sentence for a chat that no longer exists.
   */
  send: {
    400: 'Non posso inviare questo testo: controlla il messaggio.',
    404: 'Non trovo più questa chat: ricarica e riprova.',
    500: "Il server non ha accettato il messaggio: riprova, e se l'errore resta segnalalo.",
  },
};

/** Rethrows with the Italian message of the table, other statuses untouched. */
async function withMessage(call, messages) {
  try {
    return await call;
  } catch (err) {
    if (err instanceof ApiError && messages[err.status]) {
      throw new ApiError(err.status, messages[err.status]);
    }
    throw err;
  }
}

/**
 * `GET /chats/agreement/{agreementId}` -> `{chatId, messaggi}`.
 *
 * The id travels in the path and is coerced with `Number()` because the router
 * hands it over as a string. The answer goes through `normalizeChatHistory`,
 * which drops the rows the UI could not draw and renames the rest.
 */
export async function getAgreementChat(token, agreementId) {
  return normalizeChatHistory(
    await withMessage(
      apiFetch(`chats/agreement/${Number(agreementId)}`, { token }),
      MESSAGES.history,
    ),
  );
}

/**
 * `POST /chats/send-message/{chatId}` -> `true`.
 *
 * The backend answers only `{success: {code: 200, ...}}` and never the row it
 * wrote (file docstring), so `true` is all the caller gets: "accepted, go
 * re-read the history", not "here is your message".
 */
export async function sendChatMessage(token, chatId, message) {
  await withMessage(
    apiFetch(`chats/send-message/${Number(chatId)}`, {
      method: 'POST',
      token,
      body: { message },
    }),
    MESSAGES.send,
  );
  return true;
}

/**
 * `GET /chats/most-recent-message` -> the id of the newest message the user
 * received, or `null` when there is none: the cursor the polling call needs.
 *
 * Parsed with `toIntegerOrNull`, never `Number()`: an absent id must stay
 * `null` and must not become the cursor `0`, which would re-deliver every
 * message the user ever received.
 */
export async function getMostRecentMessageId(token) {
  const response = await apiFetch('chats/most-recent-message', { token });
  return toIntegerOrNull(response?.chatMessageId);
}

/**
 * `GET /chats/check-new-messages/{recentMessageId}` -> the new rows as
 * `{id, chatId, autore, testo, inviatoIl}`, malformed rows dropped.
 *
 * The route is global across the user's chats and excludes the user's own
 * messages (file docstring): this call filters nothing, the caller picks the
 * rows of its own `chatId`.
 */
export async function getNewChatMessages(token, recentMessageId) {
  const response = await apiFetch(
    `chats/check-new-messages/${Number(recentMessageId)}`,
    { token },
  );
  const rows = Array.isArray(response) ? response : [];
  return rows.map(normalizeChatMessage).filter(Boolean);
}

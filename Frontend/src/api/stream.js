import { Platform } from 'react-native';
import { API_BASE_URL } from './config';
import { normalizeNotification } from './normalizers';
import { signalSessionExpired } from './client';

/**
 * The hand-written client of `GET /api/stream` (`docs/api.md` § Live stream).
 *
 * `EventSource` cannot send an `Authorization` header and the token must never
 * travel in a URL (`docs/decisions.md` D029), so the two bytes readers are here:
 * `fetch` + `ReadableStream` on the web, `XMLHttpRequest` with incremental
 * `responseText` on native, which has neither streaming `fetch` nor `EventSource`.
 *
 * Three rules from the contract that shape this file:
 *
 * 1. **The connection ends by itself** after 30 s (`app.stream.max_seconds`).
 *    That is not a fault: the caller reconnects immediately, and no request
 *    timeout of `apiFetch` applies (a 10 s cap would kill every stream).
 * 2. **The cursor is the client's.** `after` is the last notification id already
 *    applied; omitting it starts at the live edge. `id:` on a frame is the new
 *    cursor.
 * 3. **Bytes that stop arriving are a dead socket.** A `: ping` is written every
 *    15 s of silence, so `STREAM_IDLE_MS` of nothing at all means the connection
 *    is gone even if the platform has not said so yet.
 */

/** How long a stream may stay silent before it is considered dead. */
export const STREAM_IDLE_MS = 45000;

/** The event types that make a screen re-read. One event type, its `data` says who. */
const AGREEMENT_TYPES = new Set([
  'AGREEMENT_PROPOSAL',
  'AGREEMENT_RESPONSE',
  'AGREEMENT_DETAILS',
  'AGREEMENT_DETAILS_ACCEPTED',
  'AGREEMENT_CANCELLED',
  'AGREEMENT_COMPLETED',
]);

const PROFILE_TYPES = new Set(['USER_PROMOTED', 'USER_STATUS_CHANGED', 'SERVICE_RESTORED']);

/** A non-negative integer, or `null`: everything the stream counts is one. */
function interoOrNull(value) {
  // `Number(null)`, `Number('')` and `Number(undefined)` are 0 or NaN: a cursor
  // that was never set must stay absent, not become "replay my whole inbox".
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numero = Number(value);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

/**
 * Grows the buffer with one chunk and returns the frames that are complete.
 *
 * `rest` is the raw text of the frame still open — not just the last incomplete
 * line — so the next chunk re-parses it whole and a frame split anywhere (mid
 * field, mid `data:` line, mid blank line) still arrives as one frame.
 *
 * A parser must ignore lines starting with `:` (`: ping` is a comment frame),
 * join multiple `data:` lines with a newline, and treat a blank line as the end
 * of a frame.
 */
export function parseEventStream(buffer, chunk) {
  const righe = `${buffer}${chunk}`.split(/\r\n|\n|\r/);
  // The text after the last newline is not a line yet: a chunk that ends with
  // `\n` must not look like the blank line that closes a frame.
  const incompleta = righe.pop() ?? '';
  const frames = [];
  let corrente = { event: null, id: null, data: [] };
  let pending = [];

  for (const riga of righe) {
    if (riga === '') {
      if (corrente.data.length > 0 || corrente.event !== null) {
        frames.push({
          event: corrente.event ?? 'message',
          id: corrente.id,
          data: corrente.data.join('\n'),
        });
      }
      corrente = { event: null, id: null, data: [] };
      pending = [];
      continue;
    }
    pending.push(riga);
    if (riga.startsWith(':')) {
      continue;
    }
    const separatore = riga.indexOf(':');
    const campo = separatore === -1 ? riga : riga.slice(0, separatore);
    let valore = separatore === -1 ? '' : riga.slice(separatore + 1);
    if (valore.startsWith(' ')) {
      valore = valore.slice(1);
    }
    if (campo === 'event') {
      corrente.event = valore;
    } else if (campo === 'id') {
      corrente.id = valore;
    } else if (campo === 'data') {
      corrente.data.push(valore);
    }
  }

  return { frames, rest: pending.concat([incompleta]).join('\n') };
}

/** One frame in the shape the provider consumes, or `null` for frames it ignores. */
function interpreta(frame) {
  let dati = null;
  try {
    dati = frame.data ? JSON.parse(frame.data) : null;
  } catch {
    // The `id:` line is still a cursor: a frame that cannot be read must not
    // pin the cursor, or the row is replayed on every reconnect.
    return frame.event === 'notification'
      ? { type: 'cursor', lastId: interoOrNull(frame.id) }
      : null;
  }
  if (frame.event === 'hello') {
    return {
      type: 'hello',
      lastId: interoOrNull(dati?.lastId),
      nonLette: interoOrNull(dati?.unreadCount),
    };
  }
  if (frame.event === 'notification') {
    const notifica = normalizeNotification(dati?.notification);
    if (notifica === null) {
      // A row that cannot be normalised must still move the cursor: the server
      // resumes after the id it is handed (`afterId`), so a cursor stuck on a
      // broken frame would replay the whole queue on every reconnect.
      return { type: 'cursor', lastId: interoOrNull(frame.id) };
    }
    return {
      type: 'notification',
      notifica,
      nonLette: interoOrNull(dati?.unreadCount),
      lastId: interoOrNull(frame.id) ?? notifica.id,
    };
  }
  return null;
}

/** `GET /api/stream`, with the cursor as the only query parameter it accepts. */
export function streamUrl(after) {
  const cursore = interoOrNull(after);
  return cursore === null ? `${API_BASE_URL}/stream` : `${API_BASE_URL}/stream?after=${cursore}`;
}

/** Web: `fetch` whose body is read chunk by chunk. No timeout of our own. */
function openWithFetch({ url, token, onChunk, onClose, onError }) {
  const controller = new AbortController();
  let chiuso = false;

  fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        onError({ status: response.status });
        return;
      }
      const body = response.body;
      if (!body || typeof body.getReader !== 'function') {
        onError({ status: 0, detail: 'response body is not streamable' });
        return;
      }
      const reader = body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done || chiuso) {
          break;
        }
        if (value) {
          onChunk(decoder.decode(value, { stream: true }));
        }
      }
      if (!chiuso) {
        onClose({ reason: 'eof' });
      }
    })
    .catch((error) => {
      if (chiuso) {
        return;
      }
      // Our own `close()` aborts the controller; anything else is a real fault.
      onError({ status: 0, detail: error?.message ?? null });
    });

  return {
    close() {
      chiuso = true;
      controller.abort();
    },
  };
}

/** Native: `XMLHttpRequest` grows `responseText`, so only the delta is parsed. */
function openWithXhr({ url, token, onChunk, onClose, onError }) {
  const xhr = new XMLHttpRequest();
  let letto = 0;
  let chiuso = false;

  xhr.open('GET', url);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.setRequestHeader('Accept', 'text/event-stream');
  // No limit: the server closes at 30 s and a client-side timeout would cut a
  // healthy connection. The idle watchdog below is the real guard.
  xhr.timeout = 0;

  const leggi = () => {
    let testo = '';
    try {
      testo = xhr.responseText ?? '';
    } catch {
      // Reading before the first bytes is not a fault: there is nothing yet.
      return;
    }
    if (testo.length <= letto) {
      return;
    }
    const pezzo = testo.slice(letto);
    letto = testo.length;
    onChunk(pezzo);
  };

  xhr.onprogress = leggi;
  xhr.onload = () => {
    if (chiuso) {
      return;
    }
    if (xhr.status >= 400) {
      onError({ status: xhr.status });
      return;
    }
    leggi();
    onClose({ reason: 'eof' });
  };
  xhr.onerror = () => {
    if (!chiuso) {
      onError({ status: 0 });
    }
  };
  xhr.ontimeout = () => {
    if (!chiuso) {
      onError({ status: 0 });
    }
  };
  xhr.send();

  return {
    close() {
      chiuso = true;
      try {
        xhr.abort();
      } catch {
        // An already finished request has nothing to abort.
      }
    },
  };
}

/**
 * Opens one stream and hands every parsed frame to `onFrame`.
 *
 * Frames: `{type: 'hello', lastId, nonLette}` once, then
 * `{type: 'notification', notifica, nonLette, lastId}` per row, oldest first.
 * `close()` is the caller walking away; `onClose` means the server ended the
 * response (normal after 30 s) or it went silent for `STREAM_IDLE_MS`;
 * `onError` carries `{status}` — `401` already reported the expired session
 * through `signalSessionExpired`, so the caller must not retry it.
 *
 * `platform` is the transport choice; it is a parameter so a test can pick a
 * side without mocking `react-native`.
 */
export function startEventStream({
  token,
  after = null,
  onFrame,
  onClose,
  onError,
  platform = Platform.OS,
}) {
  let buffer = '';
  let chiuso = false;
  let watchdog = null;
  let trasporto = null;

  const fermaWatchdog = () => {
    if (watchdog !== null) {
      clearTimeout(watchdog);
      watchdog = null;
    }
  };

  const chiudi = (esito) => {
    if (chiuso) {
      return;
    }
    chiuso = true;
    fermaWatchdog();
    trasporto?.close();
    if (esito) {
      onClose(esito);
    }
  };

  const riarmaWatchdog = () => {
    fermaWatchdog();
    watchdog = setTimeout(() => chiudi({ reason: 'idle' }), STREAM_IDLE_MS);
  };

  const consuma = (pezzo) => {
    if (chiuso) {
      return;
    }
    const { frames, rest } = parseEventStream(buffer, pezzo);
    buffer = rest;
    riarmaWatchdog();
    for (const frame of frames) {
      const evento = interpreta(frame);
      if (evento !== null) {
        onFrame(evento);
      }
    }
  };

  const guasto = (errore) => {
    if (chiuso) {
      return;
    }
    if (errore?.status === 401) {
      signalSessionExpired();
    }
    chiuso = true;
    fermaWatchdog();
    trasporto?.close();
    onError(errore);
  };

  const apri = platform === 'web' ? openWithFetch : openWithXhr;
  trasporto = apri({
    url: streamUrl(after),
    token,
    onChunk: consuma,
    onClose: chiudi,
    onError: guasto,
  });
  riarmaWatchdog();

  return { close: () => chiudi(null) };
}

/** `true` when the row is an event of the agreements tab. */
export function affectsAgreements(notifica) {
  return Boolean(notifica) && AGREEMENT_TYPES.has(notifica.tipo);
}

/** `true` when the row belongs to the chat the screen is showing. */
export function affectsChat(notifica, chatId) {
  if (!notifica || notifica.tipo !== 'CHAT_MESSAGE' || !Number.isInteger(chatId)) {
    return false;
  }
  return Number(notifica.dati?.chatId) === chatId;
}

/** `true` when the row can change who the user is or what the profile says. */
export function affectsProfile(notifica) {
  return Boolean(notifica) && PROFILE_TYPES.has(notifica.tipo);
}

/** `true` when a queue match landed and the match tab has a new row. */
export function affectsMatch(notifica) {
  return Boolean(notifica) && notifica.tipo === 'MATCH_CREATED';
}

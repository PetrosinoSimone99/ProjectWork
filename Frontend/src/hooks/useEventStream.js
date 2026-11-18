import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { startEventStream } from '@/api/stream';

/**
 * One stream for the whole app, and the only place `startEventStream` is called.
 *
 * The provider lives in the root layout, inside `AuthProvider`, because the
 * stream is per user and crossing: one connection serves the chat, the
 * agreements, the badge and the queue screen (`docs/decisions.md` D029). A hook
 * per screen would open one connection per screen, and `php -S` runs a fixed
 * worker pool (`PHP_CLI_SERVER_WORKERS=12`).
 *
 * What the provider owns and what it deliberately does not:
 *
 * - **It owns the cursor.** `after` is the last notification id it applied; the
 *   connection ends by itself after 30 s, so the reconnect must hand that id
 *   back or every 30 s would be a silent hole. The cursor stays in memory: a
 *   remount starts at the live edge, and the focus reads already on every
 *   screen cover the gap.
 * - **It owns the unread count.** `hello` and every `notification` frame carry
 *   it, so the badge does not need a second request. Screens read it through
 *   `useStreamState`.
 * - **It does not know any screen.** A frame is handed to every listener as a
 *   row; the consumer decides with the predicates in `api/stream.js` whether it
 *   is its business. One event type, no routing table inside the provider.
 * - **It does not keep the connection alive in the background.** `AppState`
 *   other than `'active'` closes it: a backgrounded app has no screen to
 *   refresh and a worker would stay busy. Coming back reconnects at once.
 */

/** Wait before reconnecting after the server's own 30 s close. */
export const STREAM_RECONNECT_MS = 500;

/** First wait after a transport fault; it doubles on every failure. */
export const STREAM_BACKOFF_MS = 1000;

/** Ceiling of that backoff, so a broken network is not hammered. */
export const STREAM_BACKOFF_MAX_MS = 30000;

/** The state outside a provider: no connection, no count, no cursor. */
const NESSUNO_STREAM = { connected: false, unreadCount: null, lastId: null };

/** Stable per provider: `{ subscribe }`. Kept apart from the state on purpose. */
const StreamApiContext = createContext(null);

/** Changes with every frame; separate so subscribing does not re-subscribe. */
const StreamStateContext = createContext(NESSUNO_STREAM);

/**
 * The whole connection lifecycle of one account: open, hand frames over,
 * reconnect, close.
 *
 * It is a plain factory and not an effect body because the rules are the
 * interesting part — the server closes by design, a fault backs off, a `401`
 * does not retry, a backgrounded app holds no worker — and a flat function says
 * that better than four nested closures inside a component.
 */
function createStreamLoop({ token, listeners, onState }) {
  let chiuso = false;
  let sorgente = null;
  let timer = null;
  let tentativi = 0;
  let cursore = null;
  let attivo = AppState.currentState !== 'background';
  let ascoltoAppState = null;

  const fermaTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const stato = (patch) => onState({ token, ...patch });

  const programma = (attesa) => {
    fermaTimer();
    timer = setTimeout(() => {
      timer = null;
      apri();
    }, attesa);
  };

  const consuma = (evento) => {
    if (evento.lastId !== null) {
      cursore = evento.lastId;
    }
    if (evento.nonLette !== null) {
      stato({ connected: true, unreadCount: evento.nonLette, lastId: cursore });
    } else {
      stato({ connected: true, lastId: cursore });
    }
    if (evento.type !== 'notification') {
      return;
    }
    for (const listener of listeners) {
      listener(evento.notifica);
    }
  };

  const stacca = (corrente) => {
    if (sorgente === corrente) {
      sorgente = null;
    }
    return !chiuso;
  };

  function apri() {
    if (chiuso || !attivo || sorgente !== null) {
      return;
    }
    fermaTimer();

    // The server ends every connection after 30 s, and the idle watchdog ends
    // a dead socket: reconnecting is the normal path, not a recovery.
    const allaChiusura = () => {
      if (!stacca(sorgente)) {
        return;
      }
      stato({ connected: false });
      programma(STREAM_RECONNECT_MS);
    };

    const alGuasto = (errore) => {
      if (!stacca(sorgente)) {
        return;
      }
      stato({ connected: false });
      if (errore?.status === 401) {
        // The session is gone and the app is leaving for the login screen:
        // retrying would only hammer a route that keeps answering 401.
        tentativi = 0;
        return;
      }
      programma(Math.min(STREAM_BACKOFF_MS * 2 ** tentativi, STREAM_BACKOFF_MAX_MS));
      tentativi += 1;
    };

    sorgente = startEventStream({
      token,
      after: cursore,
      onFrame: (evento) => {
        tentativi = 0;
        consuma(evento);
      },
      onClose: allaChiusura,
      onError: alGuasto,
    });
  }

  const sulCambioAppState = (statoNuovo) => {
    const oraAttivo = statoNuovo === 'active';
    if (oraAttivo === attivo) {
      return;
    }
    attivo = oraAttivo;
    if (attivo) {
      apri();
      return;
    }
    fermaTimer();
    const aperta = sorgente;
    sorgente = null;
    aperta?.close();
    stato({ connected: false });
  };

  return {
    start() {
      ascoltoAppState = AppState.addEventListener('change', sulCambioAppState);
      apri();
    },
    stop() {
      chiuso = true;
      fermaTimer();
      ascoltoAppState?.remove();
      ascoltoAppState = null;
      const aperta = sorgente;
      sorgente = null;
      aperta?.close();
    },
  };
}

export function EventStreamProvider({ children }) {
  const { token } = useAuth();
  // The frame state carries the token it belongs to: when the account changes,
  // the previous user's count is not drawn even for one render.
  const [frameState, setFrameState] = useState(null);

  const listenersRef = useRef(new Set());
  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);
  const api = useMemo(() => ({ subscribe }), [subscribe]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }
    const loop = createStreamLoop({
      token,
      listeners: listenersRef.current,
      onState: (prossimo) =>
        setFrameState((precedente) => ({
          connected: prossimo.connected,
          unreadCount: prossimo.unreadCount ?? precedente?.unreadCount ?? null,
          lastId: prossimo.lastId ?? precedente?.lastId ?? null,
          token: prossimo.token,
        })),
    });
    loop.start();
    return () => loop.stop();
  }, [token]);

  const state = frameState !== null && frameState.token === token ? frameState : NESSUNO_STREAM;

  return (
    <StreamApiContext.Provider value={api}>
      <StreamStateContext.Provider value={state}>{children}</StreamStateContext.Provider>
    </StreamApiContext.Provider>
  );
}

/**
 * Runs `handler` for every `notification` frame, with the row in the internal
 * shape (`tipo`, `dati`, …) the inbox already draws.
 *
 * Outside a provider it does nothing, which is also what keeps a screen test
 * that wraps nothing honest: the screen must work without the stream.
 */
export function useStreamEvent(handler) {
  const api = useContext(StreamApiContext);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!api) {
      return undefined;
    }
    return api.subscribe((notifica) => {
      handlerRef.current?.(notifica);
    });
  }, [api]);
}

/** `{ connected, unreadCount, lastId }`; the neutral state outside a provider. */
export function useStreamState() {
  return useContext(StreamStateContext);
}

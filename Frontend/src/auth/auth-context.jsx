import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as api from '@/api/barattolo';
import { setSessionExpiredHandler } from '@/api/client';
import { clearSession, isTokenValid, loadSession, saveSession } from './token-store';

const AuthContext = createContext(null);

/**
 * L'utente della sessione a partire dalla risposta di accesso.
 *
 * `api/barattolo.js` restituisce già la forma interna (`{token, utente}`, con
 * `ruolo` derivato dai `roles` del backend e `stato` grezzo), normalizzata in
 * `api/normalizzazioni.js`: qui si prende e basta, con difesa per una risposta
 * senza `utente`. Nessuna logica di permesso vive qui: questo codice si limita
 * a portare il dato.
 */
function utenteDallaRisposta(risposta) {
  return risposta?.utente ?? null;
}

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState(null);

  // All'avvio ripristiniamo la sessione salvata, se il token non è scaduto.
  useEffect(() => {
    let active = true;
    loadSession()
      .then((stored) => {
        if (!active) {
          return;
        }
        if (stored && isTokenValid(stored.token)) {
          setSession(stored);
        } else if (stored) {
          void clearSession();
        }
      })
      .catch((error) => {
        // Un errore di storage non impedisce l'uso dell'app: si riparte scollegati.
        console.warn('Impossibile leggere la sessione salvata.', error);
      })
      .finally(() => {
        if (active) {
          setBooting(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Quando un'API risponde 401 con token allegato, la sessione va azzerata
  // (token scaduto o revocato): l'utente torna da solo alla schermata di login.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      void clearSession();
      setSession(null);
    });
    return () => {
      setSessionExpiredHandler(null);
    };
  }, []);

  const signIn = useCallback(async (username, password) => {
    const response = await api.login(username, password);
    const nextSession = { token: response.token, utente: utenteDallaRisposta(response) };
    await saveSession(nextSession);
    setSession(nextSession);
  }, []);

  const signUp = useCallback(async (input) => {
    const response = await api.register(input);
    const nextSession = { token: response.token, utente: utenteDallaRisposta(response) };
    await saveSession(nextSession);
    setSession(nextSession);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  // Rilegge la sessione salvata (pull-to-refresh del Profilo): se nel frattempo
  // il token è scaduto si chiude la sessione, altrimenti la UI torna allineata
  // ai dati salvati più di recente. `ruolo` e `stato` vivono dentro l'utente
  // salvato e tornano con lui: `loadSession` restituisce l'oggetto intero.
  const ricaricaSessione = useCallback(async () => {
    const stored = await loadSession();
    if (!stored || !isTokenValid(stored.token)) {
      await clearSession();
      setSession(null);
      return;
    }
    setSession(stored);
  }, []);

  const value = useMemo(
    () => ({
      booting,
      token: session?.token ?? null,
      utente: session?.utente ?? null,
      signIn,
      signUp,
      signOut,
      ricaricaSessione,
    }),
    [booting, session, signIn, signUp, signOut, ricaricaSessione],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook di accesso all'autenticazione: lancia se usato fuori da AuthProvider. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato dentro <AuthProvider>.');
  }
  return context;
}

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '@/api/client';
import { ottieniCategorie } from '@/api/barattolo';

/**
 * Le categorie e il loro stato: «caricale e dimmi in che stato sono».
 *
 * Esiste perché la stessa logica era già scritta due volte (`register.jsx` e
 * `offro-e-cerco.jsx`, ~15 righe identiche) e la home sarebbe stata la terza
 * copia: con il terzo uso la duplicazione è reale e si estrae.
 *
 * Non è un semplice `useState`: lo **stato** è la cosa che serve alla UI
 * (`'caricamento' | 'pronto' | 'vuoto' | 'errore'`), perché una tendina vuota,
 * una che sta caricando e una che non ha potuto caricare si dicono in tre modi
 * diversi. `errore` porta il messaggio da mostrare quando lo stato è `'errore'`.
 * `ricarica` è la funzione del pulsante «Riprova».
 *
 * Le altre due schermate che caricano le categorie non sono state convertite in
 * questa sessione: restano le loro copie, come deciso dal titolare.
 *
 * L'uso di `useFocusEffect` (e non `useEffect`) è lo stesso delle altre due
 * schermate: le categorie si richiedono quando la schermata torna in primo
 * piano, così restano quelle vere anche dopo un giro altrove.
 */
export function useCategorie(token) {
  const [categorie, setCategorie] = useState([]);
  const [stato, setStato] = useState('caricamento');
  const [errore, setErrore] = useState(null);

  // Nessun `setState` prima del primo `await`: la scrittura dello stato avviene
  // quando la risposta arriva, non quando la richiesta parte (è anche il motivo
  // per cui l'effetto non provoca un render a cascata).
  const carica = useCallback(async () => {
    try {
      const elenco = await ottieniCategorie(token);
      setCategorie(elenco);
      setStato(elenco.length > 0 ? 'pronto' : 'vuoto');
      setErrore(null);
    } catch (err) {
      setCategorie([]);
      setStato('errore');
      setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    }
  }, [token]);

  /** Il pulsante «Riprova»: rimette lo stato di caricamento e richiede. */
  const ricarica = useCallback(async () => {
    setStato('caricamento');
    setErrore(null);
    await carica();
  }, [carica]);

  // Con `useFocusEffect` (non `useEffect`) le categorie si richiedono quando la
  // schermata torna in primo piano, come nelle altre due schermate.
  useFocusEffect(
    useCallback(() => {
      void carica();
    }, [carica]),
  );

  return { categorie, stato, errore, ricarica };
}

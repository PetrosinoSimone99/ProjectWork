import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Se il sistema chiede di **ridurre il movimento**.
 *
 * Chi ha impostato «Riduci movimento» (iOS/Android) o `prefers-reduced-motion`
 * (nel browser, che sul web `react-native-web` legge al posto nostro) non vuole
 * transizioni autonome: vanno sostituite dal passaggio immediato al valore
 * finale. Non è la stessa cosa del **gesto diretto**: il dito che trascina una
 * scheda è la persona che agisce, non un'animazione che le viene imposta, quindi
 * resta legato al dito. Questo hook dice solo **se** ridurre; cosa ridurre lo
 * decide il componente.
 *
 * Il valore di partenza è `false` (movimento concesso) e si corregge appena il
 * sistema risponde: la lettura è asincrona, quindi il primo render può partire
 * prima di sapere. Una lettura fallita lascia `false` e lo dice in console: un
 * problema di piattaforma non deve diventare un blocco dell'interfaccia.
 */
export function useMovimentoRidotto() {
  const [movimentoRidotto, setMovimentoRidotto] = useState(false);

  useEffect(() => {
    let montato = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((ridotto) => {
        if (montato) {
          setMovimentoRidotto(ridotto);
        }
      })
      .catch((errore) => {
        console.warn('Impossibile leggere la riduzione del movimento:', errore);
      });

    // L'iscrizione segue i cambi di impostazione **a caldo**: chi cambia
    // preferenza non deve ricaricare la schermata. Sul web `remove` non c'è se
    // il browser non espone `matchMedia`, da qui l'opzionale.
    const iscrizione = AccessibilityInfo.addEventListener('reduceMotionChanged', setMovimentoRidotto);

    return () => {
      montato = false;
      iscrizione?.remove();
    };
  }, []);

  return movimentoRidotto;
}

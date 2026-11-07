import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

/**
 * Il tab del match automatico.
 *
 * Il calcolo delle compatibilità è una richiesta al backend (vedi
 * `docs/backend-gaps.md`): finché non esiste, la schermata dichiara che la
 * funzione non è attiva invece di mostrare candidati inventati. Il tab resta
 * nella barra perché la navigazione a cinque voci è già quella definitiva e
 * aggiungerlo dopo cambierebbe l'ordine sotto le dita dell'utente.
 */
export default function MatchScreen() {
  return (
    <Screen>
      <AppText variant="title">Match automatico</AppText>
      <EmptyState
        variante="non-disponibile"
        title="Non ancora disponibile"
        description="Il match automatico arriverà quando il backend esporrà il calcolo delle compatibilità fra richieste e offerte."
      />
    </Screen>
  );
}

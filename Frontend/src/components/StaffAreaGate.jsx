import { useRouter } from 'expo-router';
import { AppButton } from './AppButton';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { Screen } from './Screen';

/**
 * Lo stato di `/staff` e `/staff-users` per chi ha una sessione ma non il ruolo.
 *
 * Le due rotte sono registrate per **ogni** sessione attiva (`app/_layout.jsx`):
 * il collegamento dal profilo compare solo allo staff, ma un URL digitato a mano
 * arrivava lo stesso, e la persona riceveva il `403` del backend come errore
 * generico in cima alla schermata (audit UX F13). Qui la rotta dice la stessa
 * cosa che dice il profilo, e cioè che questa sezione non è sua.
 *
 * Non è un redirect: chi ha sbagliato indirizzo deve poter capire **perché** non
 * entra, e tornare indietro con un comando. È lo stesso stato vuoto di tutta
 * l'app (`EmptyState`, una sola anatomia) con un'azione vera, il ritorno al
 * profilo — che è la schermata da cui questa sezione si apre.
 *
 * La protezione resta del backend: qui si evita solo un errore da leggere.
 */
export function StaffAreaGate({ titolo, descrizione }) {
  const router = useRouter();

  return (
    <Screen scroll withBottomInset={false}>
      <PageHeader titolo={titolo} frase={descrizione} />
      <EmptyState
        icon="lock-closed-outline"
        title="Sezione riservata allo staff"
        description="Segnalazioni e utenti si gestiscono solo con il ruolo staff: il tuo account non ce l'ha. Se ti serve, chiedilo a chi amministra il progetto."
        etichettaAzione="Torna al profilo"
        onAzione={() => router.replace('/profile')}
      />
      <AppButton
        label="Indietro"
        variant="ghost"
        icon="arrow-back-outline"
        onPress={() => router.back()}
        style={{ alignSelf: 'flex-start' }}
      />
    </Screen>
  );
}

import { View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { useNotifications } from '@/hooks/useNotifications';
import { BackButton } from '@/components/BackButton';
import { Banner } from '@/components/Banner';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NotificationRow } from '@/components/NotificationRow';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { space } from '@/theme/tokens';

/**
 * «Notifiche»: the inbox of what the backend wrote for this account.
 *
 * It is a secondary screen and not a sixth tab: the tab bar has five entries and
 * a sixth would crowd it on a phone, while the web menu mirrors the same five
 * routes (`navigation/tab-routes.js`). The entry point is the row in the
 * profile, which also carries the unread count.
 *
 * The backend has no push channel, so this screen asks again when it comes back
 * to the foreground and when the user pulls: "load again" is the only freshness
 * there is, and the copy says so once in the header instead of repeating it
 * under the list.
 *
 * States, all explicit: first load (`LoadingScreen`), loaded and empty
 * (`EmptyState`), reload failure (`Banner` + retry, with the rows already on
 * screen kept), and the per-row action state (`inCorso`).
 */
export default function NotificationsScreen() {
  const { token } = useAuth();
  const {
    elementi,
    nonLette,
    caricamento,
    errore,
    azioneInCorso,
    ricarica,
    segnaLetta,
    elimina,
  } = useNotifications({ token });

  const primaCaricata = elementi !== null;
  const vuota = primaCaricata && elementi.length === 0;

  return (
    <Screen scroll withBottomInset={false} refreshing={caricamento} onRefresh={() => void ricarica()}>
      <PageHeader
        titolo="Notifiche"
        frase={
          nonLette > 0
            ? `${nonLette} da leggere. Le notifiche arrivano quando riapri la schermata.`
            : 'Proposte, risposte, schede e decisioni della staff che ti riguardano.'
        }
        indietro={<BackButton />}
      />

      {!primaCaricata && caricamento && token ? <LoadingScreen /> : null}

      {errore ? (
        <Banner
          kind="error"
          message={errore}
          etichettaAzione="Riprova"
          onAzione={() => void ricarica()}
          caricamentoAzione={caricamento}
        />
      ) : null}

      {primaCaricata && vuota ? (
        <EmptyState
          icon="notifications-off-outline"
          title="Nessuna notifica"
          description="Qui arrivano le proposte di scambio, le risposte, le schede e le decisioni della staff. Per ora non c'è niente da leggere."
        />
      ) : null}

      {primaCaricata && !vuota ? (
        <View style={{ gap: space.sm }}>
          {elementi.map((notifica) => (
            <NotificationRow
              key={notifica.id}
              notifica={notifica}
              inCorso={azioneInCorso?.id === notifica.id ? azioneInCorso : null}
              onLetta={() => void segnaLetta(notifica.id)}
              onElimina={() => void elimina(notifica.id)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from './AppText';
import { Banner } from './Banner';
import { ModalShell } from './ModalShell';
import { NotificationRow } from './NotificationRow';
import { useAuth } from '@/auth/auth-context';
import { useNotifications } from '@/hooks/useNotifications';
import { space, useTokens } from '@/theme/tokens';

/** The sentence shown when the inbox has been read and holds no row. */
const INBOX_VUOTA =
  "Qui arrivano le proposte di scambio, le risposte, le schede e le decisioni della staff. Per ora non c'è niente da leggere.";

/**
 * The notifications inbox as a centered panel over the profile, on web and on
 * mobile: the screen `/notifications` is gone, so the profile band is the only
 * door in.
 *
 * The panel owns its data (`useAuth` for the token, `useNotifications` for list
 * and state) and its callers pass nothing but `visible` / `onClose`, the same
 * two names every other panel of the app speaks.
 *
 * Four states, never mixed: the first answer has not arrived yet (a local
 * loading row, because `RigaCaricamento` belongs to the agreements screen), the
 * request failed (a `Banner` carrying its own «Riprova», so the user does not
 * have to close the panel and find the command elsewhere), the inbox is loaded
 * and empty, and the rows. The count never appears here: the badge on the band
 * is the one place that states it, and the auto-read below makes a number in
 * the description drop while it is being read.
 *
 * Opening the panel marks nothing: the rows keep their dot, their «Non letta»
 * and their accent border while the panel is open, which is the only way the
 * person looking at them can tell what is new. **Closing** is the act that
 * reads: `chiudi` closes the panel at once (the X cannot wait for the network)
 * and then marks the rows the panel showed, one `PATCH` per row because the
 * backend has no bulk read. When the marks settle it calls `onLette`, so the
 * badge in the profile is re-read after the writes and not before them.
 *
 * Three props, and no more: `visible`, `onClose` (required) and `onLette`
 * (optional, «the marks are done, re-read the count»).
 */
export function NotificationsSheet({ visible, onClose, onLette = null }) {
  const t = useTokens();
  const { token } = useAuth();
  const router = useRouter();
  const {
    elementi,
    caricamento,
    errore,
    azioneInCorso,
    ricarica,
    elimina,
    segnaLetteMostrate,
  } = useNotifications({ token });

  /**
   * The one way out, shared by the X, the backdrop, Escape and opening an
   * exchange. The mark is fired after the panel is already closing, and its
   * promise keeps `onLette` in its closure: the panel unmounts on close, and the
   * parent still has to hear when the writes have landed.
   */
  const chiudi = () => {
    onClose();
    void segnaLetteMostrate().finally(() => onLette?.());
  };

  return (
    <ModalShell
      visible={visible}
      onClose={chiudi}
      titolo="Notifiche"
      descrizione="Proposte, risposte, schede e decisioni della staff."
      etichettaChiudi="Chiudi le notifiche"
    >
      {/* The four states are rendered independently, not as an if/else chain:
          a failed delete or a failed reload has to leave the rows that are
          already on screen where they are (that is the hook's contract), so the
          error is a banner *above* the list, not a replacement for it. */}
      {errore ? (
        <Banner
          kind="error"
          message={errore}
          etichettaAzione="Riprova"
          onAzione={() => void ricarica()}
          caricamentoAzione={caricamento}
        />
      ) : null}

      {elementi === null && !errore ? (
        <View
          // Regione viva: chi non vede lo spinner deve sentirsi dire che la lista
          // sta arrivando (audit UX F53).
          accessibilityLiveRegion="polite"
          aria-live="polite"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
        >
          <ActivityIndicator size="small" color={t.primary} />
          <AppText variant="small" tone="secondary">
            Carico le notifiche…
          </AppText>
        </View>
      ) : null}

      {elementi !== null && elementi.length === 0 ? (
        <AppText variant="small" tone="secondary">
          {INBOX_VUOTA}
        </AppText>
      ) : null}

      {elementi !== null && elementi.length > 0 ? (
        <View style={{ gap: space.sm }}>
          {elementi.map((notifica) => (
            <NotificationRow
              key={notifica.id}
              notifica={notifica}
              inCorso={azioneInCorso?.id === notifica.id ? azioneInCorso : null}
              onElimina={() => void elimina(notifica.id)}
              onApri={() => {
                // Opening the exchange closes the panel — and closing is what
                // reads the rows — so it goes through the same door.
                chiudi();
                router.push('/agreements');
              }}
            />
          ))}
        </View>
      ) : null}
    </ModalShell>
  );
}

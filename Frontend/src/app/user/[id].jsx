import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { useUserServices } from '@/hooks/useUserServices';
import { BackButton } from '@/components/BackButton';
import { Banner } from '@/components/Banner';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { ProfileSummary } from '@/components/ProfileSummary';
import { Screen } from '@/components/Screen';
import { ServiceGroup } from '@/components/ServiceGroup';
import { space } from '@/theme/tokens';

/**
 * «Profilo»: another person's public page, at `/user/<id>`.
 *
 * It is a secondary screen like `/chat/<agreementId>`: an id route listed by
 * hand in `app/_layout.jsx`, a back arrow in the header and no tab of its own.
 * The id is the only key — the backend has no lookup from a username, and the
 * agreement rows do not carry the counterpart's id, so nobody arrives here from
 * the agreements side (brief, decision 1).
 *
 * Everything on it already existed: `useUserServices` asks
 * `GET /users/{id}/services` and hands back the normalised `{utente, offerte,
 * richieste}`. The screen adds no request of its own and no new hook, so the two
 * refused answers keep the meaning the hook gave them: `404` is **this person**
 * (unknown or deactivated account), `403` is **the reader** (the backend refuses
 * an inactive viewer), and only a real failure earns a retry.
 *
 * Five states, all explicit: first read (`LoadingScreen`), person gone
 * (`EmptyState`, no action: a retry cannot bring an account back), viewer
 * refused (`EmptyState`, no action, naming the right account), failed read
 * (`Banner` + retry), loaded but with nothing published (`ProfileSummary` above
 * an `EmptyState`, because "no publications" is about a person the screen can
 * still describe).
 *
 * The rows are text, not buttons: opening a service detail from here would mean
 * duplicating the proposal and report wiring that lives in the home catalog
 * (brief, decision 5).
 */
export default function PublicProfileScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams();

  // The router hands the segment over as a string (or an array on web).
  const grezzo = Array.isArray(params.id) ? params.id[0] : params.id;
  const numero = Number(grezzo);
  const ownerId = Number.isInteger(numero) && numero > 0 ? numero : null;

  const { dati, disponibile, caricamento, ricaricando, errore, mancante, vietato, riprova } =
    useUserServices({ token, ownerId });

  const offerte = dati?.offerte ?? [];
  const richieste = dati?.richieste ?? [];
  const senzaPubblicazioni = dati !== null && offerte.length === 0 && richieste.length === 0;

  return (
    <Screen scroll withBottomInset={false}>
      <PageHeader titolo="Profilo" indietro={<BackButton />} />

      {/* First read. An id the endpoint cannot be asked about is not a read to
          wait for: it is a link the app cannot resolve, so it gets the same
          answer as a person the backend does not know. */}
      {caricamento ? <LoadingScreen label="Guardo il profilo…" /> : null}

      {!disponibile || mancante ? (
        <EmptyState
          icon="person-outline"
          title="Profilo non disponibile"
          description="Questa persona non esiste o il suo account non è più attivo."
        />
      ) : null}

      {vietato ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Account non attivo"
          description="Il tuo account non è attivo: una pagina di un'altra persona non è visibile a un account inattivo. Rivolgiti alla staff per riattivarlo."
        />
      ) : null}

      {errore ? (
        <Banner
          kind="error"
          message={errore}
          etichettaAzione="Riprova"
          onAzione={() => void riprova()}
          caricamentoAzione={ricaricando}
        />
      ) : null}

      {/* The person is there and describes themselves, even when there is
          nothing published yet: the summary stays above the empty state. */}
      {dati !== null ? <ProfileSummary utente={dati.utente} /> : null}

      {senzaPubblicazioni ? (
        <EmptyState
          icon="file-tray-outline"
          title="Nessuna pubblicazione"
          description="Questa persona non ha ancora offerte o ricerche pubblicate."
        />
      ) : null}

      {dati !== null && !senzaPubblicazioni ? (
        <View style={{ gap: space.md }}>
          {/* `limite={null}` e `righe={null}`: la pagina mostra ogni
              pubblicazione, e la mostra intera. Il taglio a tre righe e a una
              riga appartiene alla mini-card dentro il dettaglio servizio. */}
          <ServiceGroup
            titolo="Offre"
            icona="pricetag-outline"
            servizi={offerte}
            limite={null}
            righe={null}
          />
          <ServiceGroup
            titolo="Cerca"
            icona="search-outline"
            servizi={richieste}
            limite={null}
            righe={null}
          />
        </View>
      ) : null}
    </Screen>
  );
}

import { View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { useUserServices } from '@/hooks/useUserServices';
import { AppIcon } from '@/components/AppIcon';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { radius, space, useTokens } from '@/theme/tokens';

/** How many rows the card shows before it just counts the rest. */
const RIGHE_VISIBILI = 3;

/** The two groups, in the order the card draws them. */
const GRUPPI = [
  { chiave: 'offerte', titolo: 'Offre', icona: 'pricetag-outline' },
  { chiave: 'richieste', titolo: 'Cerca', icona: 'search-outline' },
];

function Gruppo({ titolo, icona, servizi }) {
  const t = useTokens();
  if (!Array.isArray(servizi) || servizi.length === 0) {
    return null;
  }
  const visibili = servizi.slice(0, RIGHE_VISIBILI);
  const resto = servizi.length - visibili.length;

  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <AppIcon name={icona} size={14} color={t.textSecondary} />
        <AppText variant="small" style={{ fontWeight: '600' }}>
          {titolo}
        </AppText>
      </View>
      {visibili.map((servizio) => (
        <AppText key={servizio.chiave} variant="small" tone="secondary">
          {`- ${servizio.descrizione}`}
        </AppText>
      ))}
      {resto > 0 ? (
        <AppText variant="small" tone="secondary">
          {`e ${resto} altr${resto === 1 ? 'a' : 'e'}`}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * «Cosa offre e cerca»: the person's other published services, inside the
 * service detail.
 *
 * This block used to be a declared gap (`backend-gaps.md` G3: no public profile
 * endpoint). `GET /users/{id}/services` closes it, so the sentences that said
 * "not available for now" are gone and the card shows what the person publishes.
 *
 * Four states, all explicit and all compact, because the block lives inside a
 * modal that must not jump: a missing person (the row is not drawn at all), the
 * first load (one secondary line), nothing published (one secondary line), a
 * failure (a banner with retry, only for failures a retry can fix — an inactive
 * account or a person who no longer exists says so and offers no button).
 */
export function UserServicesMiniCard({ ownerId, ownerNome = null }) {
  const t = useTokens();
  const { token } = useAuth();
  const { dati, disponibile, caricamento, ricaricando, errore, nonDisponibile, riprova } =
    useUserServices({ token, ownerId });

  if (!disponibile) {
    return null;
  }

  const chi = ownerNome ?? 'Questa persona';
  const offerte = dati?.offerte ?? [];
  const richieste = dati?.richieste ?? [];
  const vuota = dati !== null && offerte.length === 0 && richieste.length === 0;

  return (
    <View
      style={{
        gap: space.xs,
        padding: space.md,
        borderRadius: radius.input,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.background,
      }}
    >
      <AppText variant="small" style={{ fontWeight: '600' }}>
        Cosa offre e cerca
      </AppText>

      {caricamento ? (
        <AppText variant="small" tone="secondary">
          Carico le altre pubblicazioni di questa persona…
        </AppText>
      ) : null}

      {nonDisponibile ? (
        <AppText variant="small" tone="secondary">
          {`Le pubblicazioni di ${chi} non sono disponibili: l'account non è attivo o non esiste più.`}
        </AppText>
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

      {vuota ? (
        <AppText variant="small" tone="secondary">
          {`${chi} non ha altre offerte o ricerche pubblicate.`}
        </AppText>
      ) : null}

      {GRUPPI.map((gruppo) => (
        <Gruppo
          key={gruppo.chiave}
          titolo={gruppo.titolo}
          icona={gruppo.icona}
          servizi={dati?.[gruppo.chiave]}
        />
      ))}
    </View>
  );
}

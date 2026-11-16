import { View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { useUserServices } from '@/hooks/useUserServices';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { ServiceGroup } from '@/components/ServiceGroup';
import { radius, space, useTokens } from '@/theme/tokens';

/** How many rows the card shows before it just counts the rest. */
const RIGHE_VISIBILI = 3;

/**
 * The rows the card draws: every publication except the service the detail
 * panel is already showing — the reader has it in front of them, so listing it
 * again under «Cosa offre e cerca» would be noise.
 *
 * Identity is the whole `(tipo, id)` pair: `/offers/{id}` and `/requests/{id}`
 * are two separate id sequences, so a request can share the numeric id of the
 * open offer and must survive the filter. Null or absent lists come back as
 * `[]`, and the input array is never touched (a new array every time).
 */
export function otherServices(servizi, apertoDaEscludere) {
  const elenco = Array.isArray(servizi) ? servizi : [];
  if (apertoDaEscludere === null || apertoDaEscludere === undefined) {
    return [...elenco];
  }
  return elenco.filter(
    (servizio) =>
      servizio.tipo !== apertoDaEscludere.tipo || servizio.id !== apertoDaEscludere.id,
  );
}

/** The two groups, in the order the card draws them. */
const GRUPPI = [
  { chiave: 'offerte', titolo: 'Offre', icona: 'pricetag-outline' },
  { chiave: 'richieste', titolo: 'Cerca', icona: 'search-outline' },
];

/**
 * «Cosa offre e cerca»: the person's other published services, inside the
 * service detail.
 *
 * «Other» means other: the panel passes the service it is showing as
 * `apertoDaEscludere` and the card drops it from both groups, so the detail
 * never repeats what the reader already has in front of them (`otherServices`).
 *
 * This block used to be a declared gap (`backend-gaps.md` G3: no public profile
 * endpoint). `GET /users/{id}/services` closes it, so the sentences that said
 * "not available for now" are gone and the card shows what the person publishes.
 *
 * Five states, all explicit and all compact, because the block lives inside a
 * modal that must not jump: no person to ask about (the block is not drawn), the
 * first load (one secondary line), nothing published (one secondary line), the
 * person is gone (one secondary line, no button — a retry cannot bring an
 * account back), the viewer is refused (`403`, one secondary line naming the
 * right cause: *their own* inactive account), and a real failure (a banner with
 * retry). The distinction between "gone" and "refused" is not pedantry: they are
 * two different sentences about two different people.
 */
export function UserServicesMiniCard({ ownerId, ownerNome = null, apertoDaEscludere = null }) {
  const t = useTokens();
  const { token } = useAuth();
  const { dati, disponibile, caricamento, ricaricando, errore, mancante, vietato, riprova } =
    useUserServices({ token, ownerId });

  if (!disponibile) {
    return null;
  }

  const chi = ownerNome ?? 'Questa persona';
  // The same filtered set feeds both the groups and the empty line: a person
  // whose only publication is the open service has *no other* publications.
  const pubblicazioni = {
    offerte: otherServices(dati?.offerte, apertoDaEscludere),
    richieste: otherServices(dati?.richieste, apertoDaEscludere),
  };
  const vuota =
    dati !== null && pubblicazioni.offerte.length === 0 && pubblicazioni.richieste.length === 0;

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

      {mancante ? (
        <AppText variant="small" tone="secondary">
          {`Le pubblicazioni di ${chi} non sono disponibili: l'account non è attivo o non esiste più.`}
        </AppText>
      ) : null}

      {vietato ? (
        <AppText variant="small" tone="secondary">
          Il tuo account non è attivo: questa persona ha pubblicato qualcosa, ma il server non lo
          mostra a un account inattivo.
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
        <ServiceGroup
          key={gruppo.chiave}
          titolo={gruppo.titolo}
          icona={gruppo.icona}
          servizi={pubblicazioni[gruppo.chiave]}
          limite={RIGHE_VISIBILI}
        />
      ))}
    </View>
  );
}

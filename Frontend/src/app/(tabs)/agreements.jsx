import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { space, useTokens } from '@/theme/tokens';

/**
 * The agreements tab: three sections and the bell, all in a declared state.
 *
 * The brief (decisions 10 and 11) fixes the shape now, even though the backend
 * has none of it: "Proposte inviate", "Accordi accettati" and "Conclusi", plus
 * the bell of the received proposals where accept/refuse happens. Received
 * proposals are visible only inside the bell panel, and a proposal the user
 * sent stays visible with its refused state.
 *
 * None of that can be drawn truthfully today: `GET /proposals`,
 * `GET /agreements` and the accept/refuse routes do not exist
 * (`docs/backend-gaps.md` G4–G6). So each section says it is not available yet,
 * and the bell shows no number: a "0" would be an invented count.
 */

const SECTIONS = [
  {
    key: 'sent',
    title: 'Proposte inviate',
    icon: 'paper-plane-outline',
    description:
      'Le proposte che hai inviato, con il loro stato: in attesa, accettate o rifiutate. Il backend non espone ancora le proposte.',
  },
  {
    key: 'accepted',
    title: 'Accordi accettati',
    icon: 'checkmark-circle-outline',
    description:
      'Gli scambi in corso, con il riepilogo del servizio, del luogo e delle date. Il backend non espone ancora gli accordi.',
  },
  {
    key: 'concluded',
    title: 'Conclusi',
    icon: 'archive-outline',
    description:
      'Gli accordi terminati, in sola lettura. Il backend non espone ancora gli accordi.',
  },
];

export default function AgreementsScreen() {
  const t = useTokens();

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Accordi</AppText>
        <AppText variant="small" tone="secondary">
          Gli scambi nati da una proposta accettata. Le proposte ricevute si accettano o si
          rifiutano dalla campanella.
        </AppText>
      </View>

      {/* The bell: no count until the proposals endpoint exists, and the line
          says why instead of showing a "0" nobody measured. */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              backgroundColor: t.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={t.textSecondary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" style={{ fontSize: 16 }}>
              Proposte ricevute
            </AppText>
            <AppText variant="small" tone="secondary">
              Non disponibile: il backend non espone ancora le proposte da accettare o
              rifiutare. La campanella mostrerà il conteggio quando ci sarà un dato reale.
            </AppText>
          </View>
        </View>
      </Card>

      {SECTIONS.map((section) => (
        <View key={section.key} style={{ gap: space.sm }}>
          <AppText variant="heading">{section.title}</AppText>
          <EmptyState
            variante="non-disponibile"
            icon={section.icon}
            title={`${section.title}: non ancora disponibile`}
            description={section.description}
          />
        </View>
      ))}
    </Screen>
  );
}

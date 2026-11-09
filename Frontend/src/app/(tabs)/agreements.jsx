import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { space } from '@/theme/tokens';
import { View } from 'react-native';

/**
 * The agreements tab.
 *
 * The lifecycle (proposal accepted -> agreement -> sheet -> conclusion) needs
 * the endpoints of `docs/backend-gaps.md` G4–G8; until they exist the tab is a
 * declared empty state, never invented data. Decision 10 of the brief: the tab
 * exists from day one so the five-voice navigation does not change later.
 */
export default function AgreementsScreen() {
  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Accordi</AppText>
        <AppText variant="small" tone="secondary">
          Gli scambi nati da una proposta accettata.
        </AppText>
      </View>
      <EmptyState
        variante="non-disponibile"
        title="Gli accordi non sono ancora disponibili"
        description="Il backend non espone ancora le proposte né gli accordi: qui vedrai le proposte inviate, quelle accettate e quelle concluse, ciascuna con il suo stato."
      />
    </Screen>
  );
}

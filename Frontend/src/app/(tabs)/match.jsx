import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { affectsMatch } from '@/api/stream';
import { cancelQueue, createQueue, listQueues, getProfile } from '@/api';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { QueueCard } from '@/components/QueueCard';
import { Screen } from '@/components/Screen';
import { hasActiveQueue, queueTypeLabel } from '@/services/queues';
import { useStreamEvent } from '@/hooks/useEventStream';
import { useRefresh } from '@/hooks/useRefresh';
import { space } from '@/theme/tokens';

/** The cost of a request queue, in words: a balance figure does not exist. */
const REQUEST_COST_COPY = 'Una coda di ricerca costa un credito.';

/** Why the request action is off while the balance is at zero. */
const NO_CREDIT_REASON = 'Non hai crediti disponibili.';


const ACTIVE_QUEUE_REASON =
  'Hai già una coda attiva: annullala per poterne crearne un’altra.';

/**
 * Whether cancelling this queue gives a credit back.
 *
 * The backend refunds only a `REQUEST` queue that has no agreement
 * (`ServiceQueueManager::cancelServiceQueue`: the `IncreaseOrRefundCredit` sits
 * in the `else if ($queue->getQueueType() === QueueType::REQUEST)` branch), and
 * an `OFFER` queue never spent one. `GET /get-queues` excludes `CLOSED` rows
 * (`ServiceQueueRepository::getServiceQueuesByUser`), so every row on screen is
 * one where the cancel really acts: the sentence is always true when it appears.
 */
function refundsCredit(queue) {
  return queue.tipo === 'REQUEST' && queue.agreementId === null;
}

/** The empty list says what to do next, without pretending the tab is broken. */
const EMPTY_TITLE = 'Nessuna coda attiva';
const EMPTY_DESCRIPTION =
  'Una coda è un servizio che metti in attesa: il match automatico confronterà le tue code con quelle della tua località. Creane una con i due pulsanti qui sotto.';


export default function MatchScreen() {
  const { token } = useAuth();
  const router = useRouter();

  // `null` until the first answer, so "still loading" and "loaded and empty"
  // stay apart.
  const [profile, setProfile] = useState(null);
  const [queues, setQueues] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [outcome, setOutcome] = useState(null);
  // One action at a time: `create:OFFER`, `create:REQUEST`, `cancel:{id}` or
  // `null`, so two taps cannot clobber each other's busy state.
  const [actionInFlight, setActionInFlight] = useState(null);

  const requestSeqRef = useRef(0);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setLoadError(null);
    // Two independent answers, so one failing does not throw away the other: a
    // list that arrived stays on screen even when the profile call did not, and
    // the banner names the failure that costs something.
    const [outcomeQueues, outcomeProfile] = await Promise.allSettled([
      listQueues(token),
      getProfile(token),
    ]);
    if (seq !== requestSeqRef.current) {
      return;
    }
    if (outcomeProfile.status === 'fulfilled') { setProfile(outcomeProfile.value); }
    if (outcomeQueues.status === 'fulfilled') {
      setQueues(outcomeQueues.value);
    }
    // A failed reload keeps what is on screen: blanking a list that had rows a
    // second ago is worse than a banner that says why.
    const failure =
      outcomeQueues.status === 'rejected'
        ? outcomeQueues.reason
        : outcomeProfile.status === 'rejected' ? outcomeProfile.reason : null;
    setLoadError(
      failure === null ? null : failure instanceof ApiError ? failure.message : GENERIC_ERROR_MESSAGE,
    );
    setLoading(false);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setOutcome(null);
      setActionError(null);
      void load();
      return () => {
        // Leaving the tab invalidates the response in flight.
        requestSeqRef.current += 1;
      };
    }, [load]),
  );

  // Un frame `MATCH_CREATED` non porta con sé la riga nuova: il match automatico
  // gira nel worker del backend, che scrive lui l'accordo. Coda e saldo vanno
  // quindi riletti, perché un accordo creato consuma il credito della coda di
  // ricerca. Nessuno stato nuovo e nessun payload disegnato.
  useStreamEvent(
    useCallback(
      (notifica) => {
        if (!affectsMatch(notifica)) {
          return;
        }
        void load();
      },
      [load],
    ),
  );

  const { refreshing, onRefresh } = useRefresh(load);

  const create = useCallback(
    async (tipo) => {
      if (!token || actionInFlight !== null) {
        return;
      }
      setActionInFlight(`create:${tipo}`);
      setActionError(null);
      setOutcome(null);
      try {
        await createQueue(token, tipo);
        setOutcome(tipo === 'OFFER' ? 'Coda di offerta creata.' : 'Coda di ricerca creata.');
        await load();
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setActionInFlight(null);
      }
    },
    [actionInFlight, load, token],
  );

  const cancel = useCallback(
    async (queue) => {
      if (!token || actionInFlight !== null) {
        return;
      }
      setActionInFlight(`cancel:${queue.id}`);
      setActionError(null);
      setOutcome(null);
      try {
        await cancelQueue(token, queue.id);
        // The banner names the queue that left the list; its description is
        // the only human identifier a row has.
        const label = queue.descrizione?.trim() || queueTypeLabel(queue.tipo).toLowerCase();
        setOutcome(
          `Coda annullata: ${label}.${
            refundsCredit(queue) ? ' Il credito della coda è tornato disponibile.' : ''
          }`,
        );
        await load();
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      } finally {
        setActionInFlight(null);
      }
    },
    [actionInFlight, load, token],
  );

  const firstLoadDone = queues !== null;
  // One active queue closes both create actions: the backend counts the two
  // types together and answers a `500` to the second call (G23).
  const activeQueue = hasActiveQueue(queues);
  const busy = actionInFlight !== null;

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader titolo="Match" frase="Le code di offerta e ricerca in attesa di uno scambio." />

      {!firstLoadDone && loading ? <LoadingScreen /> : null}

      {loadError ? (
        <Banner
          kind="error"
          message={loadError}
          etichettaAzione="Riprova"
          onAzione={() => void load()}
          caricamentoAzione={loading}
        />
      ) : null}

      {firstLoadDone && queues.length === 0 ? (
        <EmptyState
          icon="git-compare-outline"
          title={EMPTY_TITLE}
          description={EMPTY_DESCRIPTION}
        />
      ) : null}

      {profile !== null ? <AppText variant="small">{`Crediti disponibili: ${profile.crediti ?? 0}`}</AppText> : null}
      {/* Le due azioni compaiono quando la coda e il saldo sono noti: il saldo
          decide quella di ricerca, e senza non si potrebbe dire il vero. */}
      {firstLoadDone && profile !== null ? (
        <CreateQueueActions
          profile={profile}
          activeQueue={activeQueue}
          busy={busy}
          actionInFlight={actionInFlight}
          onCreate={(tipo) => void create(tipo)}
        />
      ) : null}

      {outcome ? <Banner kind="success" message={outcome} /> : null}
      {actionError ? <Banner kind="error" message={actionError} /> : null}

      {firstLoadDone && queues.length > 0 ? (
        <View style={{ gap: space.sm }}>
          {queues.map((queue) => (
            <QueueCard
              key={queue.id}
              coda={queue}
              occupata={busy}
              onAnnulla={cancel}
              onApri={() => router.push('/agreements')}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}


/**
 * Le due azioni di creazione, una per tipo: l'account ha sempre un'offerta e una
 * ricerca, quindi il tipo della coda non dipende più da quante voci esistono.
 * Restano due soli motivi per cui un pulsante è spento: una coda già attiva (il
 * backend ne ammette una sola, di un tipo) e, per la ricerca, il credito che
 * costa.
 */
function CreateQueueActions({ profile, activeQueue, busy, actionInFlight, onCreate }) {
  const hasCredit = (profile?.crediti ?? 0) > 0;
  const offerDisabled = activeQueue;
  const requestDisabled = activeQueue || !hasCredit;

  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1, gap: space.xs }}>
          <AppButton
            label="Offerta"
            variant="secondary"
            onPress={() => onCreate('OFFER')}
            disabled={offerDisabled || busy}
            loading={actionInFlight === 'create:OFFER'}
            accessibilityLabel="Crea una coda per la tua offerta"
          />
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <AppButton
            label="Ricerca"
            variant="secondary"
            onPress={() => onCreate('REQUEST')}
            disabled={requestDisabled || busy}
            loading={actionInFlight === 'create:REQUEST'}
            accessibilityLabel="Crea una coda per la tua ricerca"
          />
          <AppText variant="small" tone="secondary">
            {REQUEST_COST_COPY}
          </AppText>
          {!activeQueue && !hasCredit ? (
            <AppText variant="small" tone="secondary">
              {NO_CREDIT_REASON}
            </AppText>
          ) : null}
        </View>
      </View>
      {activeQueue ? (
        <AppText variant="small" tone="secondary">
          {ACTIVE_QUEUE_REASON}
        </AppText>
      ) : null}
    </View>
  );
}

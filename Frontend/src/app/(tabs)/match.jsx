import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { cancelQueue, createQueue, listMyServices, listQueues } from '@/api';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { QueueCard } from '@/components/QueueCard';
import { Screen } from '@/components/Screen';
import { etichettaTipoCoda, serviziDelTipo } from '@/services/queues';
import { useRefresh } from '@/hooks/useRefresh';
import { space } from '@/theme/tokens';

/** Why a create button is disabled when the account has no service of that type. */
const GATE_NEED_ONE = {
  OFFER: 'Per una coda di offerta ti serve un servizio pubblicato in «Offro e cerco».',
  REQUEST: 'Per una coda di ricerca ti serve un servizio pubblicato in «Offro e cerco».',
};

/**
 * Why a create button is disabled when the account has more than one service of
 * that type: the backend looks the service up with `getOneOrNullResult()`, so
 * two rows make the route answer a `500` (`backend-gaps.md` G19). Saying it
 * here is the only honest option: the button cannot work, and a `500` after a
 * tap would charge the credit first.
 */
function manyServicesReason(tipo, quanti) {
  const voce = tipo === 'OFFER' ? 'offerta' : 'ricerca';
  return `Hai ${quanti} servizi di questo tipo: il server crea una coda di ${voce} solo se ne hai uno (limite noto).`;
}

/** The cost of a request queue, in words: a balance figure does not exist. */
const REQUEST_COST_COPY = 'Una coda di ricerca costa un credito.';

/** The empty list says what to do next, without pretending the tab is broken. */
const EMPTY_TITLE = 'Nessuna coda attiva';
const EMPTY_DESCRIPTION =
  'Una coda è un servizio che metti in attesa: il match automatico confronta le code della tua località. Creane una qui sopra.';

/**
 * The match tab: the viewer's service queues (`GET /get-queues`) with the two
 * create actions and cancel behind a `ConfirmModal`.
 *
 * The automatic matchmaker itself is still a backend gap, so what the tab
 * shows is the queue the matchmaker consumes — real rows, not invented
 * candidates (the old "not available" empty state is gone because the queue
 * is a real surface now).
 *
 * Two backend facts shape the copy and the guards:
 *
 * - `POST /create-service-queue` looks the account's service of that type up
 *   with `getOneOrNullResult()`: no service fatals, two services fatal too, and
 *   a `REQUEST` queue spends the credit before that lookup. Each create button
 *   therefore stays disabled — with the reason spelled out — unless
 *   `listMyServices` says there is **exactly one** service of that type
 *   (`serviziDelTipo`).
 * - A request queue costs one credit and **no route exposes the balance**
 *   (`docs/backend-gaps.md` G15): the tab states the cost in words and never
 *   a figure.
 *
 * Loading follows the `useNotifications` pattern: both requests in parallel
 * on every focus, a stale response dropped by sequence, a failed reload
 * keeping the rows already on screen, and `useRefresh` for the pull.
 */
export default function MatchScreen() {
  const { token } = useAuth();

  // `null` until the first answer, so "still loading" and "loaded and empty"
  // stay apart and the create buttons only appear once the services are known.
  const [queues, setQueues] = useState(null);
  const [services, setServices] = useState(null);
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
    try {
      const [queueRows, serviceRows] = await Promise.all([
        listQueues(token),
        listMyServices(token),
      ]);
      if (seq !== requestSeqRef.current) {
        return;
      }
      setQueues(queueRows);
      setServices(serviceRows);
    } catch (err) {
      if (seq !== requestSeqRef.current) {
        return;
      }
      // A failed reload keeps what is on screen: blanking a list that had
      // rows a second ago is worse than a banner that says why.
      setLoadError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
      }
    }
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
        const label = queue.descrizione?.trim() || etichettaTipoCoda(queue.tipo).toLowerCase();
        setOutcome(`Coda annullata: ${label}.`);
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
  // Exactly one service of the type: see `serviziDelTipo` for why one is the
  // number the backend can actually use.
  const offerCount = serviziDelTipo(services, 'OFFER').length;
  const requestCount = serviziDelTipo(services, 'REQUEST').length;
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

      {services !== null ? (
        <CreateQueueActions
          offerCount={offerCount}
          requestCount={requestCount}
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
            <QueueCard key={queue.id} coda={queue} occupata={busy} onAnnulla={cancel} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * The two create actions with their reasons: a disabled button always says why,
 * and the request one carries its cost in words right under it — never a
 * balance figure, because no route exposes one.
 */
function CreateQueueActions({ offerCount, requestCount, busy, actionInFlight, onCreate }) {
  const offerDisabled = offerCount !== 1;
  const requestDisabled = requestCount !== 1;

  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <View style={{ flex: 1, gap: space.xs }}>
        <AppButton
          label="Offerta"
          onPress={() => onCreate('OFFER')}
          disabled={offerDisabled || busy}
          loading={actionInFlight === 'create:OFFER'}
        />
        {offerDisabled ? (
          <AppText variant="small" tone="secondary">
            {offerCount === 0 ? GATE_NEED_ONE.OFFER : manyServicesReason('OFFER', offerCount)}
          </AppText>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: space.xs }}>
        <AppButton
          label="Ricerca"
          onPress={() => onCreate('REQUEST')}
          disabled={requestDisabled || busy}
          loading={actionInFlight === 'create:REQUEST'}
        />
        <AppText variant="small" tone="secondary">
          {REQUEST_COST_COPY}
        </AppText>
        {requestDisabled ? (
          <AppText variant="small" tone="secondary">
            {requestCount === 0 ? GATE_NEED_ONE.REQUEST : manyServicesReason('REQUEST', requestCount)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

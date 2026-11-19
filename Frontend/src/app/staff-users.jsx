import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { listStaffUsers, promoteStaffUser, setStaffUserStatus } from '@/api';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { PillBar } from '@/components/PillBar';
import { Card } from '@/components/Card';
import { StaffUserCard } from '@/components/StaffUserCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { StaffAreaGate } from '@/components/StaffAreaGate';
import {
  ACCOUNT_STATUSES,
  ROLES,
  accountStatusLabel,
  describeEmptyUserList,
  describePromotion,
  describeStatusChange,
  nextAccountStatus,
  roleLabel,
} from '@/services/staff-users';
import { useRefresh } from '@/hooks/useRefresh';
import { usePagedList } from '@/hooks/usePagedList';
import { colonna, layout, space, useTokens } from '@/theme/tokens';
import { puoEntrareNellAreaStaff } from '@/services/staff';



/** How long the search waits after the last key before asking the server. */
const RICERCA_ATTESA_MS = 350;

/** How many rows a page brings: one size for every staff list. */
const PAGE_SIZE = 20;

/**
 * Quanto la lista tiene montato intorno alla finestra visibile: sette
 * schermate, cioè tre sopra e tre sotto. Il valore predefinito (21) terrebbe in
 * memoria un elenco che l'utente non vede, e le righe qui sono alte.
 */
const FINESTRA_RIGHE = 7;

/** Righe disegnate al primo giro: quante ne stanno in una schermata di telefono. */
const RIGHE_AL_PRIMO_GIRO = 6;

/** Righe disegnate per lotto mentre si scorre. */
const RIGHE_PER_LOTTO = 6;

/**
 * Togliere dal disegno le righe uscite dalla finestra: su Android è un guadagno
 * e le card qui non hanno ombre o trasformazioni che il taglio lascerebbe
 * visibili; su iOS la stessa proprietà ha ancora casi di celle che restano
 * bianche al ritorno, e sul web react-native-web la ignora.
 */
const TOGLI_RIGHE_FUORI_VISTA = Platform.OS === 'android';

/** La chiave di una riga: l'id dell'utente, non la pagina in cui è arrivato. */
function chiaveUtente(user) {
  return String(user.id);
}

const ROLE_FILTERS = [
  { valore: null, etichetta: 'Tutti' },
  { valore: ROLES.USER, etichetta: roleLabel(ROLES.USER) },
  { valore: ROLES.STAFF, etichetta: roleLabel(ROLES.STAFF) },
];

const STATUS_FILTERS = [
  { valore: null, etichetta: 'Tutti' },
  { valore: ACCOUNT_STATUSES.ACTIVE, etichetta: accountStatusLabel(ACCOUNT_STATUSES.ACTIVE) },
  { valore: ACCOUNT_STATUSES.INACTIVE, etichetta: accountStatusLabel(ACCOUNT_STATUSES.INACTIVE) },
];

export default function StaffUsersScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const callerId = utente?.id ?? null;

  const [actionError, setActionError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  // Il secondo livello del filtro per stato: chiuso, la scheda mostra quattro
  // comandi invece di sei, che è il tetto dell'audit (§3 P2).
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  const actionRef = useRef(false);
  const primoCaricamento = useRef(true);

  /**
   * Una pagina di utenti per `usePagedList`. Ricerca e stato sono parametri del
   * server (`q`, `accountStatus`) e partono da qui (audit UX F11); il ruolo no,
   * e resta un filtro locale sulle righe arrivate.
   */
  const carica = useCallback(
    async ({ page, limit }) => {
      if (!token) {
        // La schermata reindirizza al login: non c'è niente da chiedere.
        return { righe: [], paginazione: null };
      }
      const data = await listStaffUsers(token, {
        page,
        limit,
        q: query.trim(),
        accountStatus: statusFilter ?? '',
        role: roleFilter?.replace('ROLE_', '') ?? '',
      });
      return { righe: data.utenti, paginazione: data.paginazione };
    },
    [token, query, statusFilter, roleFilter],
  );

  const {
    voci: users,
    paginazione: pagination,
    caricamento: loading,
    caricamentoAltri: loadingMore,
    errore: error,
    erroreAltri: errorMore,
    ricarica: reload,
    caricaAltri: loadMore,
    haAltre: hasMore,
  } = usePagedList({ carica, dimensione: PAGE_SIZE });

  // Il primo caricamento lo fa `useFocusEffect`: qui si richiede solo quando la
  // ricerca o lo stato cambiano, un attimo dopo l'ultimo tasto. Si riparte
  // dalla pagina 1 perché la finestra che il server restituisce è un'altra.
  useEffect(() => {
    if (primoCaricamento.current) {
      primoCaricamento.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      void reload();
    }, RICERCA_ATTESA_MS);
    return () => clearTimeout(timer);
  }, [reload, query, statusFilter, roleFilter]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // Il gesto nativo e «Aggiorna» del web sono lo stesso comando (audit §8.8).
  const { refreshing, onRefresh } = useRefresh(reload);
  // Il pull-to-refresh è un gesto nativo: sul web la lista lo ignorerebbe, e lì
  // il comando compare nella barra del menu, pubblicato da `Screen`.
  const aggiornamentoAttivo = Platform.OS !== 'web' && typeof onRefresh === 'function';

  // Testo e stato li ha già applicati il server: qui resta il solo ruolo.
  const visible = useMemo(
    () => users ?? [],
    [users],
  );
  // Lo stato non sparisce quando il secondo livello è chiuso: il comando che lo
  // apre porta scritto lo stato in vigore, anche quando è uno dei due che
  // restano nascosti. Un filtro attivo non può essere invisibile.
  const activeStatusFilterLabel =
    statusFilter === null ? 'Tutti' : accountStatusLabel(statusFilter);
  const filtersActive = query.trim() !== '' || roleFilter !== null || statusFilter !== null;
  // I due filtri che il backend applica davvero: l'elenco vuoto li distingue dal
  // ruolo, che invece guarda solo le righe arrivate.
  const serverFiltersActive = filtersActive;
  const loaded = users === null ? null : users.length;
  const total = pagination?.elementiTotali ?? null;
  // La riga del conteggio viene dal payload (audit UX F32): «N di M» usa
  // `elementiTotali`. Con il ruolo attivo il denominatore sono le righe
  // caricate, e la parola «caricati» lo dice: il backend non ha quel filtro,
  // quindi M non sarebbe un totale.
  const count = loaded === null || total === null ? null : `${visible.length} di ${total} utenti`;

  function askPromotion(user) {
    if (actionRef.current) {
      return;
    }
    setActionError(null);
    setMessage(null);
    setConfirm({ kind: 'promote', user });
  }

  function askStatusChange(user) {
    if (actionRef.current) {
      return;
    }
    setActionError(null);
    setMessage(null);
    setConfirm({ kind: 'status', user, status: nextAccountStatus(user) });
  }

  async function runConfirm() {
    if (!confirm || actionRef.current) {
      return;
    }
    actionRef.current = true;
    setBusy(confirm.user.id);
    setActionError(null);
    setMessage(null);
    try {
      if (confirm.kind === 'promote') {
        await promoteStaffUser(token, confirm.user.id);
        setMessage('Ruolo aggiornato: ora è membro dello staff.');
      } else {
        await setStaffUserStatus(token, confirm.user.id, confirm.status);
        setMessage(
          confirm.status === ACCOUNT_STATUSES.INACTIVE
            ? 'Account disattivato.'
            : 'Account riattivato.',
        );
      }
      setConfirm(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      setConfirm(null);
    } finally {
      // La scrittura ha cambiato una riga: la pagina 1 è l'unica che si sa
      // rileggere senza indovinare dove sia finita.
      await reload();
      actionRef.current = false;
      setBusy(null);
    }
  }

  function resetFilters() {
    setQuery('');
    setRoleFilter(null);
    setStatusFilter(null);
  }

  /** Una riga dell'elenco: la card con i due comandi che l'utente può ricevere. */
  function renderUserRow({ item: user }) {
    return (
      <View accessibilityRole="listitem">
        <StaffUserCard
          user={user}
          callerId={callerId}
          busy={busy !== null && Number(busy) === Number(user.id)}
          onPromote={() => askPromotion(user)}
          onStatusChange={() => askStatusChange(user)}
        />
      </View>
    );
  }

  // Le due uscite valgono qui come su `/staff`: senza sessione si torna al
  // login (F1), senza ruolo la sezione si dichiara riservata (F13).
  if (!token) {
    return <Redirect href="/login" />;
  }
  if (!puoEntrareNellAreaStaff(utente)) {
    return (
      <StaffAreaGate
        titolo="Utenti"
        descrizione="Gli account del progetto: chi è staff, chi è attivo e chi è sospeso."
      />
    );
  }

  if (users === null && !error) {
    return <LoadingScreen label="Guardo gli utenti…" />;
  }

  const confirmText = confirm
    ? confirm.kind === 'promote'
      ? describePromotion(confirm.user)
      : describeStatusChange(confirm.user, confirm.status)
    : '';

  // Le righe non hanno un'altezza fissa: i comandi cambiano con il ruolo e con
  // lo stato (nessuno, uno, due) e un nome lungo va a capo. `getItemLayout`
  // dichiarerebbe un'altezza sola e i salti di posizione finirebbero fuori
  // posto, quindi la lista non lo passa e paga il conto con una finestra
  // piccola, lotti corti e poche righe per pagina (20).
  return (
    // La lista è la pagina: `Screen` non scorre, perché una `FlatList` dentro la
    // sua `ScrollView` sarebbe una lista virtualizzata dentro uno scroll e la
    // virtualizzazione non funzionerebbe più. La misura la porta il contenuto
    // della lista (`misuraAlFiglio`, la stessa regola della chat): la barra di
    // scorrimento sta sul bordo della finestra e la rotella sopra i gutter
    // scorre le righe (audit 2026-11-18, P1-11).
    <Screen
      scroll={false}
      misuraAlFiglio
      withBottomInset={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <FlatList
        style={{ flex: 1 }}
        // La colonna è il contenuto del nodo che scorre, non un suo antenato.
        contentContainerStyle={{
          ...colonna(layout.maxContent),
          paddingHorizontal: space.lg,
          gap: space.sm,
          flexGrow: 1,
        }}
        data={visible}
        keyExtractor={chiaveUtente}
        renderItem={renderUserRow}
        // La collezione è una lista anche per le tecnologie assistive (audit UX
        // F19): si salta da una riga all'altra.
        accessibilityRole="list"
        keyboardShouldPersistTaps="handled"
        // Filtri e conteggio scorrono con le righe: restano raggiungibili in cima
        // e non rubano altezza alla lista su un telefono.
        initialNumToRender={RIGHE_AL_PRIMO_GIRO}
        maxToRenderPerBatch={RIGHE_PER_LOTTO}
        windowSize={FINESTRA_RIGHE}
        removeClippedSubviews={TOGLI_RIGHE_FUORI_VISTA}
        refreshControl={
          aggiornamentoAttivo ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={t.primary}
              colors={[t.primary]}
              progressBackgroundColor={t.surface}
            />
          ) : undefined
        }
        ListHeaderComponent={
          // Il distacco fra le sezioni resta 32 (`space.xxl`): la testata si porta
          // `space.xl` (24) perché sotto di lei il `gap` del contenuto aggiunge gli
          // 8 che separa le righe.
          <View style={{ gap: space.xxl, paddingBottom: space.xl }}>
      <PageHeader
        titolo="Utenti"
        frase="Rendi staff un utente o sospendi il suo account."
        indietro={<BackButton />}
      />

      <AppButton
        label="Segnalazioni"
        variant="ghost"
        icon="shield-checkmark-outline"
        accessibilityLabel="Apri l'elenco delle segnalazioni"
        onPress={() => router.push('/staff')}
        style={{ alignSelf: 'flex-start' }}
      />

      <Card>
        <AppInput
          label="Cerca"
          value={query}
          onChangeText={setQuery}
          placeholder="nome, cognome o username"
        />
        <View style={{ gap: space.sm }}>
          <AppText variant="small" style={{ fontWeight: '600' }}>
            Ruolo
          </AppText>
          <PillBar
            accessibilityLabel="Filtra gli utenti per ruolo"
            scelte={ROLE_FILTERS}
            valore={roleFilter}
            onChange={setRoleFilter}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <AppText variant="small" style={{ fontWeight: '600' }}>
            Stato
          </AppText>
          {statusFilterOpen ? (
            <PillBar
              accessibilityLabel="Filtra gli utenti per stato"
              scelte={STATUS_FILTERS}
              valore={statusFilter}
              // Scegliere chiude il secondo livello: la scheda torna a quattro
              // comandi e la scelta resta scritta su quello che li riapre.
              onChange={(valore) => {
                setStatusFilter(valore);
                setStatusFilterOpen(false);
              }}
            />
          ) : (
            <AppButton
              label={`Stato: ${activeStatusFilterLabel}`}
              variant="secondary"
              icon="chevron-down-outline"
              onPress={() => setStatusFilterOpen(true)}
              accessibilityLabel={`Cambia il filtro per stato, ora: ${activeStatusFilterLabel}`}
              style={{ alignSelf: 'flex-start' }}
            />
          )}
        </View>
        {filtersActive ? (
          <AppButton
            label="Azzera filtri"
            variant="ghost"
            icon="close-outline"
            onPress={resetFilters}
            accessibilityLabel="Azzera i filtri dell'elenco utenti"
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
      </Card>

      {count ? (
        <View accessibilityLiveRegion="polite" aria-live="polite">
          <AppText variant="small" tone="secondary">
            {count}
          </AppText>
        </View>
      ) : null}

      {error ? (
        <Banner
          kind="error"
          message={error}
          etichettaAzione="Riprova"
          iconaAzione="refresh-outline"
          onAzione={() => void reload()}
          caricamentoAzione={loading}
        />
      ) : null}

      {/* Durante una ricerca lato server le righe vecchie restano: senza una
          riga che lo dica, l'elenco sembra non rispondere al tasto premuto.
          `accessibilityLiveRegion` vale da nativo, `aria-live` sul web, dove
          react-native-web ignora il primo (audit UX F4). */}
      {loading && users !== null ? (
        <View
          accessibilityLiveRegion="polite"
          aria-live="polite"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
        >
          <AppText variant="small" tone="secondary">
            Cerco fra tutti gli utenti…
          </AppText>
        </View>
      ) : null}

      {message ? (
        <Banner
          kind="success"
          message={message}
          // Chiudibile: un esito che resta fino alla scrittura successiva non si
          // legge più (audit F46). Il comando chiude e basta: «Chiudi» dice cosa
          // fa, e l'icona non promette un'azione che non c'è.
          etichettaAzione="Chiudi"
          iconaAzione="close-outline"
          onAzione={() => setMessage(null)}
        />
      ) : null}
      {actionError ? <Banner kind="error" message={actionError} /> : null}
          </View>
        }
        // Lo stato vuoto è quello del filtro corrente: la lista lo disegna dove
        // disegnerebbe le righe. Con una richiesta fallita e nessuna riga non è un
        // elenco vuoto, quindi lì non compare: l'errore ha il suo Banner.
        ListEmptyComponent={
          users !== null && visible.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="Nessun utente da mostrare"
              description={describeEmptyUserList({
                filtri: serverFiltersActive,
                ruolo: roleFilter !== null,
              })}
            />
          ) : null
        }

        // Ogni pagina appesa è un'altra riga letta: il comando resta finché il
        // backend dice che ce n'è una dopo, e quando quella richiesta fallisce il
        // suo errore ha il proprio «Riprova» invece di sparire.
        ListFooterComponent={
          hasMore || errorMore ? (
            <View style={{ gap: space.sm, paddingTop: space.xl }}>
              {hasMore && !errorMore ? (
                <AppButton
                  label={loadingMore ? 'Carico altri…' : 'Carica altri'}
                  variant="secondary"
                  icon="chevron-down-outline"
                  loading={loadingMore}
                  onPress={() => void loadMore()}
                  accessibilityLabel="Carica altri risultati"
                  style={{ alignSelf: 'center' }}
                />
              ) : null}
              {errorMore ? (
                <Banner
                  kind="error"
                  message={errorMore}
                  etichettaAzione="Riprova"
                  iconaAzione="refresh-outline"
                  onAzione={() => void loadMore()}
                  caricamentoAzione={loadingMore}
                />
              ) : null}
            </View>
          ) : null
        }
      />

      <ConfirmModal
        visible={confirm !== null}
        // Il titolo e il verbo dicono l'esito, non «cambiare lo stato»: la stessa
        // azione non può avere tre nomi (audit UX F31).
        titolo={
          confirm?.kind === 'promote'
            ? 'Rendere staff questo utente?'
            : confirm?.status === ACCOUNT_STATUSES.INACTIVE
              ? 'Sospendere questo account?'
              : 'Riattivare questo account?'
        }
        messaggio={confirmText}
        etichettaConferma={
          confirm?.kind === 'promote'
            ? 'Rendi staff'
            : confirm?.status === ACCOUNT_STATUSES.INACTIVE
              ? "Sospendi l'account"
              : "Riattiva l'account"
        }
        varianteConferma={
          confirm?.kind === 'status' && confirm.status === ACCOUNT_STATUSES.INACTIVE
            ? 'danger'
            : 'primary'
        }
        loading={busy !== null}
        onConferma={() => void runConfirm()}
        onAnnulla={() => setConfirm(null)}
      />
    </Screen>
  );
}

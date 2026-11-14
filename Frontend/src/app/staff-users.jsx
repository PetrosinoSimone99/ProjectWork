import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
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
import { ConfirmModal } from '@/components/ConfirmModal';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { StaffAreaGate } from '@/components/StaffAreaGate';
import {
  ACCOUNT_STATUSES,
  ROLES,
  accountStatusLabel,
  describePromotion,
  describeStatusChange,
  filterUsers,
  nextAccountStatus,
  roleLabel,
} from '@/services/staff-users';
import { space } from '@/theme/tokens';
import { puoEntrareNellAreaStaff } from '@/services/staff';

/**
 * "Area staff → Utenti": the list with role and account status, and the two
 * commands that change them.
 *
 * A secondary route like `/staff`: back arrow, no new tab, and a link to the
 * reports section. The permission rules live in `services/staff-users.js` (they
 * mirror `StaffController`), the screen draws what they allow and treats `403`
 * and `409` as normal outcomes: when the backend refuses, its Italian mapping
 * is shown and the list is reloaded, because the state on screen can be stale.
 *
 * The search and the status pill are **server-side** (`q` and `accountStatus`):
 * the endpoint accepts both, and filtering only the 50 loaded rows made the
 * empty state claim «Nessun utente corrisponde ai filtri» about people the
 * screen had never received (audit UX F11). The role pill stays local because
 * the endpoint has no role parameter, and the rows it hides are rows that did
 * arrive: the empty state names that case instead of blaming the search.
 */

/** How long the search waits after the last key before asking the server. */
const RICERCA_ATTESA_MS = 350;

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
  const callerId = utente?.id ?? null;

  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  const requestRef = useRef(0);
  const actionRef = useRef(false);
  const primoCaricamento = useRef(true);
  // I filtri correnti stanno in una ref, non nelle dipendenze di `load`:
  // `useFocusEffect` dipende da `load`, quindi con `query` fra le dipendenze
  // ogni tasto faceva partire subito una richiesta **e** il timer ne faceva
  // partire una seconda identica 350 ms dopo.
  const filtriRef = useRef({ q: '', accountStatus: '' });

  // Aggiornata in un effetto e non durante il render: scrivere una ref nel corpo
  // del componente è quello che `react-hooks/refs` vieta, e con ragione.
  useEffect(() => {
    filtriRef.current = { q: query.trim(), accountStatus: statusFilter ?? '' };
  }, [query, statusFilter]);

  const load = useCallback(
    async (filtri = filtriRef.current) => {
      if (!token) {
        return;
      }
      const seq = ++requestRef.current;
      setLoading(true);
      try {
        // I filtri che il backend sa applicare partono da qui: la ricerca non
        // guarda solo le righe già arrivate (audit UX F11).
        const page = await listStaffUsers(token, { limit: 50, ...filtri });
      if (seq !== requestRef.current) {
        return;
      }
      setUsers(page.utenti);
      setError(null);
    } catch (err) {
      if (seq !== requestRef.current) {
        return;
      }
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      if (seq === requestRef.current) {
        setLoading(false);
      }
    }
  },    [token],
  );

  // Il primo caricamento lo fa `useFocusEffect`: qui si richiede solo quando la
  // ricerca o lo stato cambiano, un attimo dopo l'ultimo tasto.
  useEffect(() => {
    if (primoCaricamento.current) {
      primoCaricamento.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      void load({ q: query.trim(), accountStatus: statusFilter ?? '' });
    }, RICERCA_ATTESA_MS);
    return () => clearTimeout(timer);
  }, [load, query, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestRef.current += 1;
      };
    }, [load]),
  );

  // Testo e stato li ha già applicati il server: qui resta il solo ruolo.
  const visible = useMemo(
    () => filterUsers(users ?? [], '', roleFilter, null),
    [users, roleFilter],
  );
  const filtersActive = query.trim() !== '' || roleFilter !== null || statusFilter !== null;

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
      await load();
      actionRef.current = false;
      setBusy(null);
    }
  }

  function resetFilters() {
    setQuery('');
    setRoleFilter(null);
    setStatusFilter(null);
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

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <BackButton />
        <AppText variant="title">Utenti</AppText>
      </View>

      <AppButton
        label="Segnalazioni"
        variant="ghost"
        icon="shield-checkmark-outline"
        accessibilityLabel="Apri le segnalazioni dell'area staff"
        onPress={() => router.push('/staff')}
        style={{ alignSelf: 'flex-start' }}
      />

      <AppText variant="small" tone="secondary">
        Rendi staff un utente o sospendi il suo account. Ogni modifica riguarda un'altra
        persona: la conferma dice cosa cambia e per chi, e l&apos;elenco si aggiorna subito dopo.
      </AppText>

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
          <PillBar
            accessibilityLabel="Filtra gli utenti per stato"
            scelte={STATUS_FILTERS}
            valore={statusFilter}
            onChange={setStatusFilter}
          />
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

      {error ? (
        <View style={{ gap: space.sm }}>
          <Banner kind="error" message={error} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void load()}
            loading={loading}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}

      {/* Durante una ricerca lato server le righe vecchie restano: senza una
          riga che lo dica, l'elenco sembra non rispondere al tasto premuto. */}
      {loading && users !== null ? (
        <View
          accessibilityLiveRegion="polite"
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
          // legge più (audit F46).
          etichettaAzione="Ho capito"
          iconaAzione="checkmark-outline"
          onAzione={() => setMessage(null)}
        />
      ) : null}
      {actionError ? <Banner kind="error" message={actionError} /> : null}

      {users !== null && visible.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Nessun utente da mostrare"
          description={descrizioneElencoVuoto({
            filtri: filtersActive,
            ruolo: roleFilter !== null,
          })}
        />
      ) : null}

      {/* La collezione è una lista anche per le tecnologie assistive
          (audit UX F19): si salta da una riga all'altra. */}
      <View accessibilityRole="list" style={{ gap: space.sm }}>
        {visible.map((user) => (
          <View key={user.id} accessibilityRole="listitem">
            <StaffUserCard
              user={user}
              callerId={callerId}
              busy={busy !== null && Number(busy) === Number(user.id)}
              onPromote={() => askPromotion(user)}
              onStatusChange={() => askStatusChange(user)}
            />
          </View>
        ))}
      </View>

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

/** Perché l'elenco è vuoto: tre cause diverse, tre frasi diverse. */
function descrizioneElencoVuoto({ filtri, ruolo }) {
  if (!filtri) {
    return "Non c'è nessun utente nell'elenco.";
  }
  if (ruolo) {
    return 'Nessun utente con questo ruolo fra quelli che corrispondono alla ricerca: cambia ruolo o azzera i filtri.';
  }
  return 'Nessun utente corrisponde alla ricerca o allo stato scelto: prova un altro nome o azzera i filtri.';
}

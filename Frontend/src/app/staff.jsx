import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import {
  claimStaffReport,
  getStaffOperation,
  getStaffReport,
  listStaffDeletedServices,
  listStaffOperations,
  listStaffReports,
  restoreStaffService,
  reviewStaffReport,
} from '@/api';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { StaffStatusBar, emptyTextForFilter } from '@/components/StaffStatusBar';
import { StaffReportCard } from '@/components/StaffReportCard';
import { StaffDeletedServicesSection } from '@/components/StaffDeletedServicesSection';
import { StaffOperationsLog } from '@/components/StaffOperationsLog';
import {
  StaffOperationDetail,
  StaffReportDetail,
} from '@/components/StaffDetailPanels';
import { ReportReviewSheet } from '@/components/ReportReviewSheet';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { ModalShell } from '@/components/ModalShell';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { StaffAreaGate } from '@/components/StaffAreaGate';
import { REVIEW_LABELS, emptyReview, puoEntrareNellAreaStaff, validateReview } from '@/services/staff';
import { statusLabel } from '@/services/reports';
import { nomePersona } from '@/services/offer-request';
import { usePagedList } from '@/hooks/usePagedList';
import { useRefresh } from '@/hooks/useRefresh';
import { space, useTokens } from '@/theme/tokens';

/**
 * Quante righe per richiesta in tutte e tre le liste dell'area staff: il backend
 * ferma `limit` a 50, quindi «tutti» non è una pagina sola e ogni lista pagina
 * davvero (segnalazioni, registro e servizi eliminati, stessa dimensione).
 */
const STAFF_PAGE_SIZE = 20;

/**
 * "Area staff": the reports to examine.
 *
 * Not a sixth tab: it is a secondary route opened from the Profile only when the
 * session carries the staff role (the UI hides, the backend protects). The
 * screen lists reports by status, claims a pending one and closes it with an
 * outcome and a mandatory note; both actions treat `403` and `409` as normal
 * outcomes and reload, because the state on screen can be stale.
 *
 * The operations log at the bottom is the audit trail the backend records for
 * every staff action (`GET /staff/operations`); it is read-only.
 */
export default function StaffScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const staffId = utente?.id ?? null;

  const [filter, setFilter] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null);

  const [review, setReview] = useState(null);
  const [reviewErrors, setReviewErrors] = useState({});
  const [confirm, setConfirm] = useState(null);

  // I servizi eliminati hanno richiesta ed esito propri: sono di tutti gli
  // utenti e un loro guasto non deve riscrivere il significato delle
  // segnalazioni (la stessa lezione F57 del registro).
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  // I due pannelli di dettaglio: `{ riga, loading, error }`, dove `riga` è
  // quella già in memoria e la rilettura la aggiorna o dice perché non ci è
  // riuscita (`Dettagli non aggiornati`).
  const [detail, setDetail] = useState(null);
  const [operationDetail, setOperationDetail] = useState(null);

  const actionRef = useRef(false);

  // Ogni lista chiede la sua pagina: paginazione, righe appese, risposte
  // superate e doppio tocco vivono in `usePagedList`. Qui resta solo come si
  // chiede una pagina, cioè il nome della collezione che il backend manda.
  const loadReports = useCallback(
    ({ page, limit }) =>
      listStaffReports(token, { page, limit, status: filter }).then((result) => ({
        righe: result.segnalazioni,
        paginazione: result.paginazione,
      })),
    [token, filter],
  );

  const loadOperations = useCallback(
    ({ page, limit }) =>
      listStaffOperations(token, { page, limit }).then((result) => ({
        righe: result.operazioni,
        paginazione: result.paginazione,
      })),
    [token],
  );

  const loadDeletedServices = useCallback(
    ({ page, limit }) =>
      listStaffDeletedServices(token, { page, limit }).then((result) => ({
        righe: result.servizi,
        paginazione: result.paginazione,
      })),
    [token],
  );

  // Tre liste, tre esiti: una che cade non riscrive il significato delle altre
  // (audit UX F57).
  const reports = usePagedList({ carica: loadReports, dimensione: STAFF_PAGE_SIZE });
  const operations = usePagedList({ carica: loadOperations, dimensione: STAFF_PAGE_SIZE });
  const deletedServices = usePagedList({ carica: loadDeletedServices, dimensione: STAFF_PAGE_SIZE });

  // L'hook torna un oggetto nuovo a ogni render, ma `ricarica` ha identità
  // stabile: `reloadAll` e il refresh si agganciano a quella, non all'oggetto
  // (un'identità che cambia riavvierebbe l'effetto di fuoco a ogni render).
  const ricaricaSegnalazioni = reports.ricarica;
  const ricaricaRegistro = operations.ricarica;
  const ricaricaServiziEliminati = deletedServices.ricarica;

  /**
   * Tutto quello che la schermata mostra, da pagina 1: è il comando del gesto
   * nativo, di «Aggiorna» del web (audit §8.8) e del ritorno sulla schermata.
   */
  const reloadAll = useCallback(
    () =>
      Promise.all([ricaricaSegnalazioni(), ricaricaRegistro(), ricaricaServiziEliminati()]),
    [ricaricaSegnalazioni, ricaricaRegistro, ricaricaServiziEliminati],
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }
      void reloadAll();
    }, [token, reloadAll]),
  );

  // Cambiare filtro cambia la richiesta: le segnalazioni ripartono da pagina 1,
  // le altre due liste non c'entrano e restano dove sono.
  const lastFilterRef = useRef(filter);
  useEffect(() => {
    if (lastFilterRef.current === filter) {
      return;
    }
    lastFilterRef.current = filter;
    void ricaricaSegnalazioni();
  }, [filter, ricaricaSegnalazioni]);

  // Il gesto nativo e «Aggiorna» del web sono lo stesso comando (audit §8.8):
  // prima l'unico ricaricamento era il pulsante dello stato vuoto, che esiste
  // solo quando la lista è vuota.
  const { refreshing, onRefresh } = useRefresh(reloadAll);

  async function claim(report) {
    if (actionRef.current) {
      return;
    }
    actionRef.current = true;
    setBusy({ id: report.id, action: 'claim' });
    setActionError(null);
    setMessage(null);
    try {
      await claimStaffReport(token, report.id);
      setMessage('Segnalazione presa in carico: ora puoi chiuderla.');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      // Presa in carico e chiusura scrivono un'operazione: rileggono la prima
      // pagina di segnalazioni e registro, non quella che si stava guardando.
      await Promise.all([ricaricaSegnalazioni(), ricaricaRegistro()]);
      actionRef.current = false;
      setBusy(null);
    }
  }

  function openReview(report) {
    setActionError(null);
    setMessage(null);
    setReviewErrors({});
    setReview({ report, ...emptyReview() });
  }

  /** Validation first; then the confirmation sheet, which is the real switch. */
  function askConfirmation() {
    if (!review) {
      return;
    }
    const errors = validateReview({ outcome: review.outcome, note: review.note });
    setReviewErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setConfirm({ ...review });
    setReview(null);
  }

  async function confirmReview() {
    if (!confirm || actionRef.current) {
      return;
    }
    actionRef.current = true;
    setBusy({ id: confirm.report.id, action: 'review' });
    setActionError(null);
    setMessage(null);
    try {
      await reviewStaffReport(token, confirm.report.id, {
        status: confirm.outcome,
        reviewNote: confirm.note,
      });
      setMessage('Segnalazione chiusa.');
      setConfirm(null);
    } catch (err) {
      // La chiusura non è passata (409, 403 o rete): la bozza vive in `confirm`,
      // quindi si rimette in scena prima di dire cosa è andato storto. Chiudere
      // la scheda qui distruggerebbe fino a 2000 caratteri di nota (audit P1-7),
      // la stessa lezione F44 del «No, torna indietro» più sotto.
      setReview(confirm);
      setActionError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      setConfirm(null);
    } finally {
      await Promise.all([ricaricaSegnalazioni(), ricaricaRegistro()]);
      actionRef.current = false;
      setBusy(null);
    }
  }

  /**
   * Il dettaglio della segnalazione: si apre con la riga già in memoria e poi
   * rilegge l'endpoint, così assegnazione e chiusura non restano quelle di
   * quando la lista è stata caricata.
   */
  async function openDetail(report) {
    setDetail({ report, loading: true, error: null });
    // La risposta vale solo per la riga che l'ha chiesta: aprendo A e poi B, la
    // rilettura di A non deve scrivere l'esito nel pannello di B.
    const isStillOpen = (current) =>
      current !== null && Number(current.report.id) === Number(report.id);
    try {
      const fresh = await getStaffReport(token, report.id);
      setDetail((current) => {
        if (!isStillOpen(current)) {
          return current;
        }
        // `null` significa che la risposta non aveva una riga leggibile: il
        // dato di lista resta, ma non è aggiornato e va detto.
        return fresh
          ? { report: fresh, loading: false, error: null }
          : { ...current, loading: false, error: GENERIC_ERROR_MESSAGE };
      });
    } catch (err) {
      setDetail((current) =>
        isStillOpen(current)
          ? {
              ...current,
              loading: false,
              error: err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE,
            }
          : current,
      );
    }
  }

  /** Lo stesso patto per il registro: `before`/`after` esistono solo nel dettaglio. */
  async function openOperationDetail(operation) {
    setOperationDetail({ operation, loading: true, error: null });
    const isStillOpen = (current) =>
      current !== null && Number(current.operation.id) === Number(operation.id);
    try {
      const fresh = await getStaffOperation(token, operation.id);
      setOperationDetail((current) => {
        if (!isStillOpen(current)) {
          return current;
        }
        return fresh
          ? { operation: fresh, loading: false, error: null }
          : { ...current, loading: false, error: GENERIC_ERROR_MESSAGE };
      });
    } catch (err) {
      setOperationDetail((current) =>
        isStillOpen(current)
          ? {
              ...current,
              loading: false,
              error: err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE,
            }
          : current,
      );
    }
  }

  function askRestore(service) {
    setActionError(null);
    setMessage(null);
    setRestoreTarget(service);
  }

  /** Il ripristino vero, dopo la conferma: la riga esce dalla lista al reload. */
  async function confirmRestore() {
    if (!restoreTarget || actionRef.current) {
      return;
    }
    actionRef.current = true;
    setRestoringId(restoreTarget.id);
    setActionError(null);
    setMessage(null);
    try {
      await restoreStaffService(token, restoreTarget.id);
      setMessage('Servizio ripristinato: torna a disposizione del suo proprietario.');
      setRestoreTarget(null);
      // Prima del reload: nessun'altra riga deve restare disabilitata mentre la
      // pagina 1 si ricarica.
      setRestoringId(null);
      await ricaricaServiziEliminati();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      setRestoreTarget(null);
    } finally {
      actionRef.current = false;
      setRestoringId(null);
    }
  }

  // Due uscite prima di disegnare la schermata, ed è la ragione per cui la
  // rotta gira su ogni sessione (`app/_layout.jsx`): senza sessione si torna al
  // login, senza ruolo si dice che la sezione è riservata. Prima, senza sessione
  // `load` usciva subito e `reports` restava `null`, cioè uno spinner che non si
  // risolve mai e nessuna via d'uscita (audit UX F1); senza ruolo si leggeva il
  // `403` come errore generico (F13).
  if (!token) {
    return <Redirect href="/login" />;
  }
  if (!puoEntrareNellAreaStaff(utente)) {
    return (
      <StaffAreaGate
        titolo="Area staff"
        descrizione="Le segnalazioni dei servizi, da prendere in carico e chiudere con un esito."
      />
    );
  }

  if (reports.voci === null && !reports.errore) {
    return <LoadingScreen label="Guardo le segnalazioni…" />;
  }

  const list = reports.voci ?? [];
  const busyOn = (report) => busy !== null && Number(busy.id) === Number(report.id);

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        titolo="Area staff"
        frase="Le segnalazioni dei servizi, da prendere in carico e chiudere con un esito."
        indietro={<BackButton />}
      />

      <AppButton
        label="Utenti"
        variant="ghost"
        icon="people-outline"
        accessibilityLabel="Apri gli utenti dell'area staff"
        onPress={() => router.push('/staff-users')}
        style={{ alignSelf: 'flex-start' }}
      />

      <StaffDeletedServicesSection
        services={deletedServices.voci}
        loading={deletedServices.caricamento}
        error={deletedServices.errore}
        busyId={restoringId}
        onRetry={() => void ricaricaServiziEliminati()}
        onRestore={askRestore}
        // Il doppio tocco lo ferma l'hook: una richiesta già in volo non ne
        // apre un'altra e una pagina superata non si appende alla lista nuova.
        onLoadMore={() => void deletedServices.caricaAltri()}
        hasMore={deletedServices.haAltre}
        loadingMore={deletedServices.caricamentoAltri}
      />

      {/* L'esito della pagina successiva è suo: le righe già lette restano e
          quello che è andato storto si dice qui invece di sparire. */}
      {deletedServices.erroreAltri ? (
        <AppText variant="small" tone="danger">
          {deletedServices.erroreAltri}
        </AppText>
      ) : null}

      <StaffStatusBar filter={filter} onChange={setFilter} disabled={reports.caricamento} />

      {reports.errore ? (
        <Banner
          kind="error"
          message={reports.errore}
          etichettaAzione="Riprova"
          onAzione={() => void ricaricaSegnalazioni()}
          caricamentoAzione={reports.caricamento}
        />
      ) : null}

      {message ? (
        <Banner
          kind="success"
          message={message}
          // Chiudibile: un esito che resta a schermo fino alla scrittura
          // successiva non si legge più (audit F46).
          etichettaAzione="Ho capito"
          iconaAzione="checkmark-outline"
          onAzione={() => setMessage(null)}
        />
      ) : null}
      {actionError ? <Banner kind="error" message={actionError} /> : null}

      {reports.voci !== null && list.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="Niente da esaminare"
          description={emptyTextForFilter(filter)}
          etichettaAzione="Ricarica"
          onAzione={() => void ricaricaSegnalazioni()}
        />
      ) : null}

      <View accessibilityRole="list" style={{ gap: space.sm }}>
        {list.map((report) => (
          <View key={report.id} accessibilityRole="listitem">
            <StaffReportCard
              report={report}
              staffId={staffId}
              busy={busyOn(report)}
              onClaim={() => void claim(report)}
              onReview={() => openReview(report)}
              onOpenDetail={() => void openDetail(report)}
            />
          </View>
        ))}
      </View>

      {reports.caricamento && reports.voci !== null ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : null}

      {reports.erroreAltri ? (
        <AppText variant="small" tone="danger">
          {reports.erroreAltri}
        </AppText>
      ) : null}

      {reports.haAltre ? (
        <AppButton
          label={reports.caricamentoAltri ? 'Carico altri…' : 'Carica altri 20'}
          variant="secondary"
          icon="chevron-down-outline"
          loading={reports.caricamentoAltri}
          onPress={() => void reports.caricaAltri()}
          accessibilityLabel="Carica altre venti segnalazioni"
          style={{ alignSelf: 'center' }}
        />
      ) : null}

      <Card>
        <AppText variant="heading">Registro delle operazioni</AppText>
        <AppText variant="small" tone="secondary">
          Le ultime azioni fatte dallo staff, nell&apos;ordine in cui sono state registrate.
        </AppText>
        <StaffOperationsLog
          operations={operations.voci}
          error={operations.errore}
          // Un endpoint assente non è un guasto: la sezione ha uno stato suo
          // (audit UX F57), e il flag lo porta l'hook.
          nonDisponibile={operations.erroreNonDisponibile}
          loadMoreError={operations.erroreAltri}
          loading={operations.caricamento}
          onRetry={ricaricaRegistro}
          onOpen={(operation) => void openOperationDetail(operation)}
          onLoadMore={() => void operations.caricaAltri()}
          hasMore={operations.haAltre}
          loadingMore={operations.caricamentoAltri}
          totalCount={operations.paginazione?.elementiTotali ?? null}
        />
      </Card>

      <ModalShell
        visible={review !== null}
        onClose={() => setReview(null)}
        // Il titolo dà un nome al dialogo e non ripete la conferma che segue
        // (F13); la cornice è quella di tutti gli altri pannelli (F38).
        titolo="Esito e nota"
        descrizione={
          review
            ? `Riguarda ${nomePersona(review.report.segnalato)}. La nota resta agli atti: scrivi su cosa si basa la decisione.`
            : undefined
        }
        etichettaChiudi="Chiudi la scheda di revisione"
        chiudibile={busy === null}
      >
        <ScrollView style={{ maxHeight: '85%' }}>
          {review ? (
            <ReportReviewSheet
              outcome={review.outcome}
              note={review.note}
              errors={reviewErrors}
              busy={busy !== null}
              onChangeOutcome={(outcome) => setReview({ ...review, outcome })}
              onChangeNote={(note) => setReview({ ...review, note })}
              onSubmit={askConfirmation}
              onCancel={() => setReview(null)}
            />
          ) : null}
        </ScrollView>
      </ModalShell>

      <ConfirmModal
        visible={confirm !== null}
        titolo="Confermare questo esito?"
        messaggio={
          confirm
            ? `${REVIEW_LABELS[confirm.outcome] ?? 'Chiudi la segnalazione'} su ${nomePersona(
                confirm.report.segnalato,
              )}.\n\nEsito: ${statusLabel(confirm.outcome) ?? confirm.outcome}\nNota: ${confirm.note.trim()}\n\nDopo la chiusura la pratica non si riapre.`
            : ''
        }
        etichettaConferma={confirm ? `Chiudi come «${statusLabel(confirm.outcome) ?? confirm.outcome}»` : 'Chiudi la segnalazione'}
        varianteConferma="danger"
        loading={busy?.action === 'review'}
        onConferma={() => void confirmReview()}
        // "No, torna indietro" deve tornare alla scheda, non distruggerla: la
        // bozza sopravvive nel `confirm` e qui si rimette in scena (audit F44).
        onAnnulla={() => {
          setReview(confirm);
          setConfirm(null);
        }}
      />

      <ConfirmModal
        visible={restoreTarget !== null}
        titolo="Ripristinare questo servizio?"
        messaggio={
          restoreTarget
            ? `${restoreTarget.mansione.trim() || 'Servizio'} di ${nomePersona(
                restoreTarget.proprietario,
              )} torna a disposizione del suo proprietario. Se era sospeso, resta sospeso.`
            : ''
        }
        etichettaConferma="Ripristina"
        // Il ripristino non distrugge niente: il colore di conferma non deve
        // dire «azione irreversibile» (stessa leva già usata altrove).
        varianteConferma="primary"
        loading={restoringId !== null}
        onConferma={() => void confirmRestore()}
        onAnnulla={() => setRestoreTarget(null)}
      />

      <ModalShell
        visible={detail !== null}
        onClose={() => setDetail(null)}
        titolo="Dettaglio della segnalazione"
        etichettaChiudi="Chiudi il dettaglio della segnalazione"
      >
        <ScrollView style={{ maxHeight: '85%' }}>
          {detail ? (
            <StaffReportDetail detail={detail} onRetry={() => void openDetail(detail.report)} />
          ) : null}
        </ScrollView>
      </ModalShell>

      <ModalShell
        visible={operationDetail !== null}
        onClose={() => setOperationDetail(null)}
        titolo="Dettaglio dell'operazione"
        etichettaChiudi="Chiudi il dettaglio dell'operazione"
      >
        <ScrollView style={{ maxHeight: '85%' }}>
          {operationDetail ? (
            <StaffOperationDetail
              detail={operationDetail}
              onRetry={() => void openOperationDetail(operationDetail.operation)}
            />
          ) : null}
        </ScrollView>
      </ModalShell>
    </Screen>
  );
}

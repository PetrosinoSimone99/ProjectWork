import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE, isEndpointUnavailable } from '@/api/client';
import {
  claimStaffReport,
  listStaffOperations,
  listStaffReports,
  reviewStaffReport,
} from '@/api';
import { AppButton } from '@/components/AppButton';
import { AppIcon } from '@/components/AppIcon';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { StaffStatusBar, emptyTextForFilter } from '@/components/StaffStatusBar';
import { StaffReportCard } from '@/components/StaffReportCard';
import { ReportReviewSheet } from '@/components/ReportReviewSheet';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ModalShell } from '@/components/ModalShell';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { formatIsoDate } from '@/services/dates';
import { REVIEW_LABELS, emptyReview, validateReview } from '@/services/staff';
import { statusLabel } from '@/services/reports';
import { nomePersona } from '@/services/offer-request';
import { space, useTokens } from '@/theme/tokens';

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
  const [reports, setReports] = useState(null);
  const [operations, setOperations] = useState(null);
  // Il registro ha il suo esito: con un `Promise.all` un guasto delle
  // segnalazioni faceva dire alla scheda del registro che l'endpoint non
  // esiste, cioè il contrario di quello che era successo (audit UX F57).
  const [operationError, setOperationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null);

  const [review, setReview] = useState(null);
  const [reviewErrors, setReviewErrors] = useState({});
  const [confirm, setConfirm] = useState(null);

  const requestRef = useRef(0);
  const actionRef = useRef(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    const seq = ++requestRef.current;
    setLoading(true);
    try {
      // Due richieste indipendenti: ognuna porta il proprio esito, così una che
      // cade non riscrive il significato dell'altra (audit UX F57).
      const [reportResult, operationResult] = await Promise.all([
        listStaffReports(token, { status: filter, limit: 50 }).then(
          (page) => ({ page }),
          (err) => ({ err }),
        ),
        listStaffOperations(token, { limit: 10 }).then(
          (page) => ({ page }),
          (err) => ({ err }),
        ),
      ]);
      if (seq !== requestRef.current) {
        return;
      }
      if (reportResult.err) {
        setError(
          reportResult.err instanceof ApiError
            ? reportResult.err.message
            : GENERIC_ERROR_MESSAGE,
        );
      } else {
        setReports(reportResult.page.segnalazioni);
        setError(null);
      }
      if (operationResult.err) {
        setOperationError(operationResult.err);
      } else {
        setOperations(operationResult.page.operazioni);
        setOperationError(null);
      }
    } finally {
      if (seq === requestRef.current) {
        setLoading(false);
      }
    }
  }, [token, filter]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestRef.current += 1;
      };
    }, [load]),
  );

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
      await load();
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
      setActionError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      setConfirm(null);
    } finally {
      await load();
      actionRef.current = false;
      setBusy(null);
    }
  }

  if (reports === null && !error) {
    return <LoadingScreen label="Guardo le segnalazioni…" />;
  }

  const list = reports ?? [];
  const busyOn = (report) => busy !== null && Number(busy.id) === Number(report.id);

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <BackButton />
        <AppText variant="title" level={1}>
          Area staff
        </AppText>
      </View>

      <AppButton
        label="Utenti"
        variant="ghost"
        icon="people-outline"
        accessibilityLabel="Apri gli utenti dell'area staff"
        onPress={() => router.push('/staff-users')}
        style={{ alignSelf: 'flex-start' }}
      />

      <AppText variant="small" tone="secondary">
        Esamina le segnalazioni, prendile in carico e chiudile con un esito. La nota
        dice su cosa si è basata la decisione: chiudi solo dopo aver riletto il riepilogo.
      </AppText>

      <StaffStatusBar filter={filter} onChange={setFilter} disabled={loading} />

      {error ? (
        <Banner
          kind="error"
          message={error}
          etichettaAzione="Riprova"
          onAzione={() => void load()}
          caricamentoAzione={loading}
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

      {reports !== null && list.length === 0 ? (
        <EmptyState
          variante="mercato"
          icon="shield-checkmark-outline"
          title="Niente da esaminare"
          description={emptyTextForFilter(filter)}
          etichettaAzione="Ricarica"
          onAzione={() => void load()}
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
            />
          </View>
        ))}
      </View>

      {loading && reports !== null ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : null}

      <Card>
        <AppText variant="heading">Registro delle operazioni</AppText>
        <AppText variant="small" tone="secondary">
          Le ultime azioni fatte dallo staff, nell&apos;ordine in cui sono state registrate.
        </AppText>
        <OperationsLog
          operations={operations}
          error={operationError}
          loading={loading}
          onRetry={load}
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
    </Screen>
  );
}

/**
 * Il registro delle operazioni: sola lettura, con il suo esito.
 *
 * Un guasto si dice come un guasto e porta la sua via d'uscita; solo un endpoint
 * assente (404/501) è "non disponibile". Prima di F57 le due richieste
 * condividevano un `Promise.all`, quindi un guasto delle segnalazioni faceva
 * scrivere qui che il servizio non restituisce il registro (audit UX F57).
 */
function OperationsLog({ operations, error, loading, onRetry }) {
  const t = useTokens();

  if (operations === null) {
    if (loading) {
      return (
        <AppText variant="small" tone="secondary">
          Carico il registro…
        </AppText>
      );
    }
    if (isEndpointUnavailable(error)) {
      return (
        <EmptyState
          variante="non-disponibile"
          icon="time-outline"
          title="Registro non disponibile"
          description="Il servizio non restituisce il registro delle operazioni: le segnalazioni e gli utenti qui sopra funzionano lo stesso."
          etichettaAzione="Riprova"
          onAzione={() => void onRetry()}
        />
      );
    }
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Registro non caricato"
        description={
          error instanceof ApiError
            ? `${error.message} Le segnalazioni qui sopra restano valide.`
            : `${GENERIC_ERROR_MESSAGE} Le segnalazioni qui sopra restano valide.`
        }
        etichettaAzione="Riprova"
        onAzione={() => void onRetry()}
      />
    );
  }

  if (operations.length === 0) {
    return (
      <AppText variant="small" tone="secondary">
        Nessuna operazione registrata.
      </AppText>
    );
  }

  return operations.map((operation) => (
    <View key={operation.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <AppIcon name="time-outline" size={15} color={t.textSecondary} />
      <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
        {`${operation.azione ?? 'Azione'} · ${operation.bersaglio ?? ''} ${
          operation.bersaglioId ?? ''
        } · ${operation.staff?.username ?? 'staff'} · ${
          formatIsoDate(operation.creataIl) ?? 'data non disponibile'
        }`}
      </AppText>
    </View>
  ));
}

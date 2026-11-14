import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { AppIcon } from '@/components/AppIcon';
import { createUserReport } from '@/api';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { nomePersona } from '@/services/offer-request';
import { REPORT_REASON_MAX, reasonError } from '@/validation';
import { space, useTokens } from '@/theme/tokens';

/**
 * "Segnala alla staff": the report the service detail offers.
 *
 * `POST /reports` accepts exactly `{reportedUserId, reason}`: the author comes
 * from the JWT, and the reason (1–2000 characters) is the whole story. There is
 * no category of report and no reference to a chain, so the screen asks for the
 * text and nothing else. Reporting yourself is refused by the backend; the
 * service detail never opens this screen for the viewer's own service.
 *
 * States: the parameters may be missing (declared empty state), the send may
 * fail (banner + retry), and success replaces the form with a closing card.
 *
 * The send goes through the `ConfirmModal`: a report cannot be withdrawn, and
 * that was only said *after* it had been sent (audit UX F02). The confirmation
 * repeats the reason and states the consequence before the POST.
 */
export default function ReportScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const params = useLocalSearchParams();

  const reportedUserId = Number(params.reportedUserId);
  const validId = Number.isInteger(reportedUserId) && reportedUserId > 0 ? reportedUserId : null;
  const reportedName = nomePersona({
    nome: params.nome,
    cognome: params.cognome,
    username: params.username,
  });

  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [confermaAperta, setConfermaAperta] = useState(false);
  const canReport = validId !== null;

  async function submit() {
    if (sending || !canReport) {
      return;
    }
    const message = reasonError(reason);
    setFieldError(message);
    if (message !== null) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      await createUserReport(token, { reportedUserId: validId, reason });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <BackButton />
        <AppText variant="title">Segnala alla staff</AppText>
      </View>

      <AppText variant="small" tone="secondary">
        La segnalazione arriva alla staff, che la esamina e decide. Racconta il fatto:
        la decisione non è dell'app.
      </AppText>

      {!canReport ? (
        <>
          <EmptyState
            title="Manca la persona da segnalare"
            description="Questa schermata si apre dal dettaglio di un servizio, che porta con sé la persona da segnalare. Riapri la segnalazione da lì."
          />
          <AppButton
            label="Torna indietro"
            variant="secondary"
            icon="arrow-back-outline"
            onPress={() => router.back()}
            style={{ alignSelf: 'flex-start' }}
          />
        </>
      ) : null}

      {canReport && sent ? (
        <Card>
          <AppText variant="heading">Segnalazione inviata</AppText>
          <Banner kind="success" message="La staff esaminerà la segnalazione." />
          <AppText variant="small" tone="secondary">
            Non riceverai un avviso nell&apos;app quando la staff la esamina. La
            segnalazione non si può ritirare.
          </AppText>
          <AppButton
            label="Torna indietro"
            icon="arrow-back-outline"
            onPress={() => router.back()}
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>
      ) : null}

      {canReport && !sent ? (
        <>
          <Card>
            <AppText variant="heading">La persona</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <AppIcon name="person-outline" size={16} color={t.textSecondary} />
              <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
                {`Segnali ${reportedName}`}
              </AppText>
            </View>
          </Card>

          <Card>
            <AppInput
              label="Cosa è successo"
              value={reason}
              onChangeText={(text) => {
                setReason(text);
                setFieldError(null);
              }}
              placeholder="Racconta il fatto: cosa era stato concordato e cosa non è stato fatto."
              multiline
              autoCapitalize="sentences"
              maxLength={REPORT_REASON_MAX}
              contatore={`${reason.length}/${REPORT_REASON_MAX}`}
              error={fieldError}
              editable={!sending}
            />
            <AppText variant="small" tone="secondary">
              Una segnalazione per persona: non puoi segnalare due volte la stessa persona.
            </AppText>
          </Card>

          {error ? (
            <Banner
              kind="error"
              message={error}
              etichettaAzione="Riprova"
              onAzione={() => void submit()}
              caricamentoAzione={sending}
            />
          ) : null}

          <AppButton
            label="Invia alla staff"
            icon="send-outline"
            onPress={() => setConfermaAperta(true)}
            loading={sending}
            // Un modulo vuoto non si invia: la ragione compariva solo dopo il
            // tocco (audit UX F07).
            disabled={reason.trim() === ''}
            accessibilityLabel={`Invia la segnalazione alla staff su ${reportedName}`}
            style={{ alignSelf: 'flex-start' }}
          />

          <ConfirmModal
            visible={confermaAperta}
            titolo="Inviare la segnalazione?"
            messaggio={`La segnalazione su ${reportedName} arriva alla staff e non si può ritirare.`}
            etichettaConferma="Invia la segnalazione"
            etichettaAnnulla="No, torna al testo"
            varianteConferma="danger"
            loading={sending}
            onConferma={() => {
              setConfermaAperta(false);
              void submit();
            }}
            onAnnulla={() => setConfermaAperta(false)}
          />
        </>
      ) : null}
    </Screen>
  );
}

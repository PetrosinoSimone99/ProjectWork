import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { generaInvito, riscattaInvito } from '@/api/barattolo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { radius, space, useTokens } from '@/theme/tokens';

const CODICE_PATTERN = /^[A-Z0-9]{8}$/;

/** Formatta "2026-09-01" come "settembre 2026" senza librerie esterne. */
function formatMese(mese) {
  const MESI = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
  ];
  const [year, month] = mese.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) {
    return mese;
  }
  return `${MESI[month - 1]} ${year}`;
}

export default function InvitiScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const t = useTokens();

  const [generating, setGenerating] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const [generateNotice, setGenerateNotice] = useState(null);

  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(null);
  const [redeemError, setRedeemError] = useState(null);

  // Unica chiamata che restituisce il codice del mese: inviti.php azione
  // "genera" è read-or-create, una lettura pura non esiste (Parte 18).
  async function handleGenerate() {
    if (!token) {
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    setGenerateNotice(null);
    try {
      const response = await generaInvito(token);
      setInviteCode({ codice: response.codice, mese: response.mese_invito });
      setGenerateNotice(response.messaggio);
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRedeem() {
    if (!token) {
      return;
    }
    const codice = redeemCode.trim().toUpperCase();
    setRedeemError(null);
    setRedeemSuccess(null);
    if (!CODICE_PATTERN.test(codice)) {
      setRedeemError('Il codice deve avere 8 lettere maiuscole o numeri.');
      return;
    }
    setRedeeming(true);
    try {
      const response = await riscattaInvito(token, codice);
      setRedeemSuccess(response.messaggio);
      setRedeemCode('');
    } catch (err) {
      setRedeemError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <Screen scroll withBottomInset={false}>
      {/* La schermata non è più una tab: il ritorno lo offre questa freccia
          (come in chat), perché lo Stack non disegna nessuna intestazione. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Torna indietro"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            backgroundColor: pressed ? t.border : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </Pressable>
        <AppText variant="title">Inviti</AppText>
      </View>

      <View style={{ gap: space.xs }}>
        <AppText variant="small" tone="secondary">
          Invita un amico: quando riscatta il tuo codice, ricevi 10 crediti.
        </AppText>
      </View>

      <Card>
        <AppText variant="heading">Il tuo codice del mese</AppText>
        {inviteCode ? (
          <View style={{ gap: space.sm, alignItems: 'center', paddingVertical: space.sm }}>
            <AppText variant="title" style={{ letterSpacing: 6, fontVariant: ['tabular-nums'] }}>
              {inviteCode.codice}
            </AppText>
            <AppText variant="small" tone="secondary">
              Valido per {formatMese(inviteCode.mese)}
            </AppText>
          </View>
        ) : (
          <AppText variant="small" tone="secondary">
            Genera il codice di questo mese e condividilo con chi vuoi invitare.
          </AppText>
        )}
        {generateNotice ? <Banner kind="info" message={generateNotice} /> : null}
        {generateError ? <Banner kind="error" message={generateError} /> : null}
        <AppButton
          label={inviteCode ? 'Rigenera codice' : 'Genera codice'}
          onPress={handleGenerate}
          loading={generating}
          icon="ticket-outline"
        />
      </Card>

      <Card>
        <AppText variant="heading">Riscatta un codice</AppText>
        <AppText variant="small" tone="secondary">
          Hai ricevuto un codice da un amico? Inseriscilo qui.
        </AppText>
        {redeemSuccess ? <Banner kind="success" message={redeemSuccess} /> : null}
        {redeemError ? <Banner kind="error" message={redeemError} /> : null}
        <AppInput
          label="Codice invito"
          value={redeemCode}
          onChangeText={setRedeemCode}
          placeholder="es. AB3D7K9Q"
          autoCapitalize="characters"
          maxLength={8}
        />
        <AppButton
          label="Riscatta"
          onPress={handleRedeem}
          loading={redeeming}
          disabled={!redeemCode.trim()}
          variant="secondary"
          icon="gift-outline"
        />
      </Card>

      <View style={{ paddingHorizontal: space.xs }}>
        <AppText variant="small" tone="secondary" style={{ color: t.textSecondary }}>
          Regole: un solo codice al mese per invitante; ogni account può riscattare un solo
          invito in tutto; i crediti vanno all'invitante al riscatto.
        </AppText>
      </View>
    </Screen>
  );
}

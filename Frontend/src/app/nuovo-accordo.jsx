import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { creaAccordo } from '@/api/barattolo';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { radius, space, useTokens } from '@/theme/tokens';

function readParam(value) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

/** Minuti come intero positivo, altrimenti `null`: il backend rifiuta gli altri valori. */
function parseDurataPositiva(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const FORM_VUOTO = { durataMia: '', durataAltro: '' };

/**
 * Proposta di un accordo 1:1.
 *
 * L'id dell'altra persona arriva dai parametri di rotta e non si sceglie qui: il
 * backend non espone un elenco utenti, quindi si può solo ricevere un id già
 * noto, cioè dal dettaglio di un annuncio o da una chat.
 */
export default function NuovoAccordoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token } = useAuth();
  const t = useTokens();
  const [form, setForm] = useState(FORM_VUOTO);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const idAltro = Number(readParam(params.id));
  const idValido = Number.isInteger(idAltro) && idAltro > 0;
  const usernameAltro = readParam(params.username);
  const nomeAltro = readParam(params.nome) || usernameAltro || 'questa persona';

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const errors = {};
    if (parseDurataPositiva(form.durataMia) === null) {
      errors.durataMia = 'Indica i minuti della tua attività: un numero intero maggiore di zero.';
    }
    if (parseDurataPositiva(form.durataAltro) === null) {
      errors.durataAltro =
        "Indica i minuti dell'attività dell'altra persona: un numero intero maggiore di zero.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function tornaIndietro() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/accordi');
  }

  async function handleSubmit() {
    setError(null);
    if (!token || !idValido || !validate()) {
      return;
    }
    setSubmitting(true);
    try {
      const idAccordo = await creaAccordo(
        token,
        idAltro,
        parseDurataPositiva(form.durataMia),
        parseDurataPositiva(form.durataAltro),
      );
      if (!Number.isInteger(idAccordo) || idAccordo <= 0) {
        throw new ApiError(200, 'Risposta non valida dal server degli accordi.');
      }
      // `replace` e non `push`: tornare indietro al modulo già inviato
      // significherebbe poter creare due volte lo stesso accordo.
      router.replace({ pathname: '/accordo', params: { id: String(idAccordo) } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Torna indietro"
          onPress={tornaIndietro}
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
        <AppText variant="title" style={{ fontSize: 22 }}>
          Proponi un accordo
        </AppText>
      </View>

      {error ? <Banner kind="error" message={error} /> : null}

      {idValido ? (
        <>
          <Card>
            <AppText variant="caption" tone="secondary">
              Proposta a
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="person-circle-outline" size={22} color={t.textSecondary} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText style={{ fontWeight: '600' }}>{nomeAltro}</AppText>
                {usernameAltro ? (
                  <AppText variant="small" tone="secondary">
                    @{usernameAltro}
                  </AppText>
                ) : null}
              </View>
            </View>
            <AppText variant="small" tone="secondary">
              Ogni accordo 1:1 nasce da un annuncio o da una chat: la persona non si cerca qui
              perché il backend non espone un elenco di utenti.
            </AppText>
          </Card>

          <View style={{ gap: space.md }}>
            <AppInput
              label="La mia durata (minuti)"
              value={form.durataMia}
              onChangeText={(value) => setField('durataMia', value)}
              placeholder="es. 60"
              keyboardType="numeric"
              error={fieldErrors.durataMia ?? null}
            />
            <AppInput
              label="La sua durata (minuti)"
              value={form.durataAltro}
              onChangeText={(value) => setField('durataAltro', value)}
              placeholder="es. 45"
              keyboardType="numeric"
              error={fieldErrors.durataAltro ?? null}
            />
            <AppText variant="small" tone="secondary">
              Le due durate fanno parte della proposta: ognuno mette il tempo che offre, e
              l'accordo si chiude con 10 crediti a testa per entrambi.
            </AppText>
            <AppButton
              label="Proponi accordo"
              icon="swap-horizontal-outline"
              onPress={() => void handleSubmit()}
              loading={submitting}
            />
          </View>
        </>
      ) : (
        <View style={{ gap: space.md }}>
          <Banner
            kind="error"
            message="Destinatario non valido. Proponi l'accordo dal dettaglio di un annuncio o dalla chat."
          />
          <AppButton
            label="Torna agli accordi"
            variant="secondary"
            icon="swap-horizontal-outline"
            onPress={() => router.replace('/accordi')}
          />
        </View>
      )}
    </Screen>
  );
}

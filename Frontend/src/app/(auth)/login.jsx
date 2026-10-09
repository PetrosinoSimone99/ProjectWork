import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { space, useTokens } from '@/theme/tokens';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const t = useTokens();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!username.trim() || !password) {
      setError('Inserisci username e password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(username.trim(), password);
      // A login riuscito la root navigation passa da sola ai tab (stato utente).
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  // =========================================================================
  //  TOUR AUTOMATICO (strumento di verifica) — GANCIO DA RIMUOVERE
  //  -------------------------------------------------------------------
  //  Provoca da solo il banner «login sbagliato»: il tour arriva su
  //  `/login?tourErrore=1` e il form invia credenziali apposta sbagliate
  //  (fisse, mai quelle di prova), così il messaggio d'errore reale del
  //  backend si fotografa senza mano. Gira SOLO con EXPO_PUBLIC_TOUR=1 e
  //  solo in sviluppo (__DEV__). NON È UNA FEATURE DELL'APP:
  //  quando la review è finita questo blocco va rimosso (o lasciato
  //  commentato, se il tour riparte) — nota anche in `temp/ios-mirror/`
  //  e nel diario di `docs/00-progetto/stato-e-diario.md`.
  // =========================================================================
  const parametri = useLocalSearchParams();
  useEffect(() => {
    if (!__DEV__ || process.env.EXPO_PUBLIC_TOUR !== '1') return undefined;
    if (parametri.tourErrore !== '1') return undefined;
    let vivo = true;
    void signIn('tour-errore', 'tour-errore').catch((errore) => {
      if (vivo) {
        setError(errore instanceof ApiError ? errore.message : 'Errore imprevisto. Riprova.');
      }
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametri.tourErrore]);

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xl }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            backgroundColor: t.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="swap-horizontal" size={30} color={t.onPrimary} />
        </View>
        <AppText variant="title">Baratto-lo</AppText>
        <AppText
          variant="small"
          tone="secondary"
          style={{ textAlign: 'center', maxWidth: 300 }}
        >
          Scambia servizi con la tua comunità: offri ciò che sai fare, trova chi cerca
          quello che offri.
        </AppText>
      </View>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        {error ? <Banner kind="error" message={error} /> : null}
        <AppInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="il tuo username"
          autoCapitalize="none"
        />
        <AppInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="la tua password"
          secureTextEntry
        />
        <AppButton label="Accedi" onPress={handleSubmit} loading={submitting} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <AppText variant="small" tone="secondary">
          Non hai un account?
        </AppText>
        <Link href="/register" asChild>
          <AppText variant="small" tone="primary" style={{ fontWeight: '700' }}>
            Registrati
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { AppIcon } from '@/components/AppIcon';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { requiredError } from '@/validation';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Login: username and password only.
 *
 * The failure copy is generic on purpose (owner's rule, 27 September 2026): the
 * screen never says whether the username exists, whether the password is wrong
 * or whether the account is inactive. `api/index.js` collapses the backend
 * statuses into one message, so nothing here depends on the English text.
 * Missing-field errors are explicit: they are about what the user is typing.
 *
 * Two things are new since the audit. The session-expiry line: when a request
 * returned 401 the session was cleared and the navigator dropped the user here
 * with no explanation (F25) — the reason now comes from `useAuth` and says what
 * happened. And the return path: the screen remembers where the user was
 * (`ritorno`) so re-logging in does not start the task over (F26).
 */
export default function LoginScreen() {
  const { signIn, motivoUscita, congedaMotivo } = useAuth();
  const router = useRouter();
  const { ritorno } = useLocalSearchParams();
  const t = useTokens();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    const found = {
      username: requiredError(username, "Inserisci l'username."),
      password: requiredError(password, 'Inserisci la password.'),
    };
    setErrors(Object.fromEntries(Object.entries(found).filter(([, value]) => value !== null)));
    if (found.username !== null || found.password !== null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(username.trim(), password);
      // On success the root navigator switches to the tabs by itself; if the
      // user was thrown out of a screen, they land back on it.
      if (typeof ritorno === 'string' && ritorno.startsWith('/')) {
        router.replace(ritorno);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xl }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.pill,
            backgroundColor: t.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="swap-horizontal" size={30} color={t.onPrimary} />
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
        {motivoUscita ? (
          <Banner
            kind="info"
            message={motivoUscita}
            etichettaAzione="Ho capito"
            iconaAzione="checkmark-outline"
            onAzione={congedaMotivo}
          />
        ) : null}
        {error ? <Banner kind="error" message={error} /> : null}
        <AppInput
          label="Username"
          value={username}
          onChangeText={(value) => {
            setUsername(value);
            setErrors((current) => ({ ...current, username: null }));
          }}
          placeholder="il tuo username"
          autoCapitalize="none"
          error={errors.username ?? null}
          editable={!submitting}
        />
        <AppInput
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: null }));
          }}
          placeholder="la tua password"
          secureTextEntry
          error={errors.password ?? null}
          editable={!submitting}
          onSubmitEditing={() => void handleSubmit()}
        />
        <AppButton
          label="Accedi"
          onPress={() => void handleSubmit()}
          loading={submitting}
          // Il modulo vuoto non e' inviabile: prima il bottone restava attivo e
          // la ragione compariva solo dopo il tocco (audit UX F07).
          disabled={username.trim() === '' || password === ''}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xs }}>
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

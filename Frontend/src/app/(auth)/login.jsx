import { useState } from 'react';
import { View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import { AuthShell } from '@/components/AuthShell';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { requiredError } from '@/validation';
import { space } from '@/theme/tokens';

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
 *
 * The masthead is not this screen's: it comes from `AuthShell`, which the
 * registration shares, and the form sits in the middle of the window instead of
 * hanging under the safe area with empty space below it (audit UX F90).
 */
export default function LoginScreen() {
  const { signIn, motivoUscita, congedaMotivo } = useAuth();
  const router = useRouter();
  const { ritorno } = useLocalSearchParams();
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
      // Solo un percorso interno: `//host` è un URL protocol-relative e non deve
      // diventare una destinazione.
      if (typeof ritorno === 'string' && !ritorno.startsWith('//') && ritorno.startsWith('/')) {
        router.replace(ritorno);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell centrata>
      <View style={{ gap: space.md }}>
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
    </AuthShell>
  );
}

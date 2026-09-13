import { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { space } from '@/theme/tokens';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [servizio, setServizio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  function validate() {
    const errors = {};
    if (!nome.trim()) errors.nome = 'Il nome è obbligatorio.';
    if (!cognome.trim()) errors.cognome = 'Il cognome è obbligatorio.';
    if (!username.trim()) errors.username = "L'username è obbligatorio.";
    if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Email non valida.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
    }
    if (!servizio.trim()) errors.servizio = 'Descrivi il servizio che offri.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setError(null);
    if (!validate()) {
      return;
    }
    setSubmitting(true);
    try {
      await signUp({
        nome: nome.trim(),
        cognome: cognome.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        descrizione_servizio: servizio.trim(),
      });
      // A registrazione riuscita la root navigation passa da sola ai tab.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll withBottomInset>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Crea il tuo profilo</AppText>
        <AppText variant="small" tone="secondary">
          Bastano pochi dati per iniziare a scambiare servizi.
        </AppText>
      </View>

      {error ? <Banner kind="error" message={error} /> : null}

      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Nome"
              value={nome}
              onChangeText={setNome}
              placeholder="Mario"
              autoCapitalize="words"
              error={fieldErrors.nome ?? null}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Cognome"
              value={cognome}
              onChangeText={setCognome}
              placeholder="Rossi"
              autoCapitalize="words"
              error={fieldErrors.cognome ?? null}
            />
          </View>
        </View>
        <AppInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="mario.rossi"
          autoCapitalize="none"
          error={fieldErrors.username ?? null}
        />
        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="mario@esempio.it"
          keyboardType="email-address"
          error={fieldErrors.email ?? null}
        />
        <AppInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder={`almeno ${MIN_PASSWORD_LENGTH} caratteri`}
          secureTextEntry
          error={fieldErrors.password ?? null}
        />
        <AppInput
          label="Servizio che offri"
          value={servizio}
          onChangeText={setServizio}
          placeholder="es. ripetizioni di matematica, piccoli lavori in giardino"
          multiline
          error={fieldErrors.servizio ?? null}
        />
        <AppButton label="Crea account" onPress={handleSubmit} loading={submitting} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <AppText variant="small" tone="secondary">
          Hai già un account?
        </AppText>
        <Link href="/login" asChild>
          <AppText variant="small" tone="primary" style={{ fontWeight: '700' }}>
            Accedi
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { creaRichiesta } from '@/api/barattolo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { space } from '@/theme/tokens';

const EMPTY_FORM = {
  titolo: '',
  descrizione: '',
  tariffa: '',
  durata: '',
  localita: '',
};

/** Converte una stringa numerica facoltativa in intero positivo, altrimenti null. */
function parseOptionalPositiveInt(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 'invalid';
  }
  return parsed;
}

export default function RichiesteScreen() {
  const { token } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const errors = {};
    if (!form.titolo.trim()) {
      errors.titolo = 'Il titolo è obbligatorio.';
    }
    if (!form.descrizione.trim()) {
      errors.descrizione = 'La descrizione è obbligatoria.';
    }
    if (parseOptionalPositiveInt(form.tariffa) === 'invalid') {
      errors.tariffa = 'Deve essere un numero intero positivo.';
    }
    if (parseOptionalPositiveInt(form.durata) === 'invalid') {
      errors.durata = 'Deve essere un numero intero positivo.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (!token || !validate()) {
      return;
    }
    setSubmitting(true);
    try {
      const tariffa = parseOptionalPositiveInt(form.tariffa);
      const durata = parseOptionalPositiveInt(form.durata);
      const response = await creaRichiesta(token, {
        titolo: form.titolo.trim(),
        descrizione: form.descrizione.trim(),
        ...(typeof tariffa === 'number' ? { tariffa_oraria_crediti: tariffa } : {}),
        ...(typeof durata === 'number' ? { durata_minuti: durata } : {}),
        ...(form.localita.trim() ? { localita: form.localita.trim() } : {}),
      });
      setSuccess(response.messaggio);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Pubblica una richiesta</AppText>
        <AppText variant="small" tone="secondary">
          Descrivi il servizio che ti serve: gli altri utenti lo troveranno nella ricerca.
        </AppText>
      </View>

      {success ? <Banner kind="success" message={success} /> : null}
      {error ? <Banner kind="error" message={error} /> : null}

      <View style={{ gap: space.md }}>
        <AppInput
          label="Titolo"
          value={form.titolo}
          onChangeText={(value) => setField('titolo', value)}
          placeholder="es. Ripetizioni di informatica"
          error={fieldErrors.titolo ?? null}
        />
        <AppInput
          label="Descrizione"
          value={form.descrizione}
          onChangeText={(value) => setField('descrizione', value)}
          placeholder="Spiega cosa ti serve e quando"
          multiline
          error={fieldErrors.descrizione ?? null}
        />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Tariffa crediti/h"
              value={form.tariffa}
              onChangeText={(value) => setField('tariffa', value)}
              placeholder="es. 10"
              keyboardType="numeric"
              optionalHint="facoltativa"
              error={fieldErrors.tariffa ?? null}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Durata (minuti)"
              value={form.durata}
              onChangeText={(value) => setField('durata', value)}
              placeholder="es. 60"
              keyboardType="numeric"
              optionalHint="facoltativa"
              error={fieldErrors.durata ?? null}
            />
          </View>
        </View>
        <AppInput
          label="Località"
          value={form.localita}
          onChangeText={(value) => setField('localita', value)}
          placeholder="es. Firenze"
          autoCapitalize="words"
          optionalHint="facoltativa"
        />
        <AppButton label="Pubblica" onPress={handleSubmit} loading={submitting} />
      </View>

      <Card>
        <AppText variant="small" tone="secondary">
          Nota: l'elenco delle tue richieste pubblicate non è ancora disponibile. Il backend
          non espone un endpoint di lettura: quando sarà pronto lo collegheremo qui.
        </AppText>
      </Card>
    </Screen>
  );
}

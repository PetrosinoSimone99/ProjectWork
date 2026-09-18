import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { Banner } from './Banner';
import { EditorVoceServizio } from './EditorVoceServizio';
import { LIMITE_LOCALITA, TIPI_VOCE } from '@/servizi/offerta-ricerca';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Il form di una pubblicazione: crea e modifica usano lo stesso componente.
 *
 * Riusa `EditorVoceServizio` — cioè la stessa forma della registrazione
 * (categoria + mansione + «da remoto») — e aggiunge la **località dell'annuncio**,
 * che è cosa diversa dalla località della persona: quella vive nella sessione.
 * Senza intestazione e senza cestino, perché qui la voce è una sola e si annulla
 * il form, non si toglie una voce.
 *
 * Nessuno stato proprio: la voce, gli errori e le chiamate arrivano dalla
 * schermata, che è l'unica a sapere se sta creando o modificando.
 */
export function FormVoceServizio({
  tipo,
  voce,
  categorie,
  statoCategorie,
  fieldErrors = {},
  errore,
  categoriePronte = true,
  salvataggio = false,
  onCambia,
  onSalva,
  onAnnulla,
}) {
  const t = useTokens();
  const offerta = tipo === TIPI_VOCE.OFFERTA;
  // Un id è la prova che la voce esiste già sul server: decide creazione o modifica.
  const inModifica = Number.isInteger(voce.id);
  const titolo = inModifica
    ? `Modifica ${offerta ? "l'offerta" : 'la ricerca'}`
    : `Nuova ${offerta ? 'offerta' : 'ricerca'}`;
  const etichettaSalva = inModifica
    ? 'Salva la modifica'
    : offerta
      ? "Pubblica l'offerta"
      : 'Pubblica la ricerca';

  return (
    <View
      style={{
        gap: space.md,
        padding: space.md,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.input,
      }}
    >
      <AppText variant="heading">{titolo}</AppText>

      <EditorVoceServizio
        voce={voce}
        numero={1}
        categorie={categorie}
        statoCategorie={statoCategorie}
        errori={fieldErrors}
        mostraIntestazione={false}
        mostraRimuovi={false}
        onCambia={onCambia}
      />

      <AppInput
        label="Località"
        value={voce.localita}
        onChangeText={(valore) => onCambia('localita', valore)}
        placeholder="es. Firenze"
        autoCapitalize="words"
        maxLength={LIMITE_LOCALITA}
        optionalHint="facoltativa"
        error={fieldErrors.localita ?? null}
      />

      {/* L'errore del backend sta sopra i pulsanti, dove sta lo sguardo. */}
      {errore ? <Banner kind="error" message={errore} /> : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <AppButton
          label={etichettaSalva}
          onPress={onSalva}
          loading={salvataggio}
          disabled={!categoriePronte}
          style={{ flex: 1 }}
        />
        <AppButton
          label="Annulla"
          variant="secondary"
          onPress={onAnnulla}
          disabled={salvataggio}
        />
      </View>
    </View>
  );
}

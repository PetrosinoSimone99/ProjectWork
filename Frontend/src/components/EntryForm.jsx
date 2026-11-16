import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Banner } from './Banner';
import { EntryEditor } from './EntryEditor';
import { ListSelector } from './ListSelector';
import { PROVINCE, comuniPerProvincia } from '@/services/italian-locations';
import { TIPI_VOCE, validaVoce } from '@/services/offer-request';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Il form di una pubblicazione: crea e modifica usano lo stesso componente.
 *
 * Riusa `EntryEditor` — cioè la stessa forma della registrazione
 * (categoria + mansione + «da remoto») — e aggiunge la **località dell'annuncio**,
 * che è cosa diversa dalla località della persona: quella vive nella sessione.
 * Senza intestazione e senza cestino, perché qui la voce è una sola e si annulla
 * il form, non si toglie una voce.
 *
 * Nessuno stato proprio: la voce, gli errori e le chiamate arrivano dalla
 * schermata, che è l'unica a sapere se sta creando o modificando.
 */
export function EntryForm({
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
  // Gli obbligatori si controllano con le stesse regole del salvataggio
  // (`validaVoce`): il pulsante non si abilita finché la voce non è valida e
  // la riga sotto elenca cosa manca, così il motivo si vede prima del tap
  // (audit UX F07).
  const erroriValidazione = validaVoce(voce, categorie);
  const valida = Object.keys(erroriValidazione).length === 0;

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

      <EntryEditor
        voce={voce}
        numero={1}
        categorie={categorie}
        statoCategorie={statoCategorie}
        errori={fieldErrors}
        mostraIntestazione={false}
        mostraRimuovi={false}
        onCambia={onCambia}
      />

      <ListSelector
        label="Provincia"
        placeholder="Tutte le province"
        opzioni={PROVINCE}
        valore={voce.provincia ?? ''}
        onChange={(valore) => {
          // Cascata: il comune della provincia precedente non vale più.
          onCambia('provincia', valore);
          onCambia('comune', '');
        }}
      />

      <ListSelector
        label="Comune"
        placeholder={voce.provincia ? 'Tutti i comuni' : 'Scegli prima una provincia'}
        opzioni={comuniPerProvincia(voce.provincia)}
        valore={voce.comune ?? ''}
        disabled={!voce.provincia}
        errore={fieldErrors.localita ?? null}
        onChange={(valore) => onCambia('comune', valore)}
      />

      <AppText variant="small" tone="secondary">
        {`La località è facoltativa e si completa scegliendo il comune: nel profilo appare come Comune - Provincia.${
          voce.provincia && !voce.comune ? ' Scegli anche il comune per completare la località.' : ''
        }`}
      </AppText>

      {/* L'errore del backend sta sopra i pulsanti, dove sta lo sguardo. */}
      {errore ? <Banner kind="error" message={errore} /> : null}

      {/* Cosa manca per pubblicare, scritto sempre e non solo dopo il tap:
          con il pulsante disabilitato il motivo non avrebbe modo di apparire. */}
      {valida ? null : (
        <AppText variant="small" tone="secondary">
          {Object.values(erroriValidazione).join(' ')}
        </AppText>
      )}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <AppButton
          label={etichettaSalva}
          onPress={onSalva}
          loading={salvataggio}
          disabled={!categoriePronte || !valida}
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

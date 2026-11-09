import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { EntryEditor } from './EntryEditor';
import { LIMITE_VOCI } from '@/services/offer-request';
import { space } from '@/theme/tokens';

/**
 * Una delle due sezioni ripetibili di «cosa offro» / «cosa cerco»: titolo,
 * spiegazione, da 1 a `LIMITE_VOCI` voci e il pulsante che ne aggiunge una.
 *
 * Vive fuori dalla schermata di registrazione per due motivi: la schermata
 * resterebbe oltre la soglia di righe indicata dalle regole del progetto, e la
 * schermata 2 (Offro e cerco) elenca le stesse voci e userà la stessa sezione
 * cambiando solo le azioni accanto.
 *
 * Lo stato non sta qui: voci, errori, categorie e chiamate arrivano dalla
 * schermata, che è l'unica a sapere cosa sta modificando.
 */
export function EntriesSection({
  sezione,
  voci,
  categorie,
  statoCategorie,
  fieldErrors,
  onCambia,
  onAggiungi,
  onRimuovi,
  allowEmpty = false,
}) {
  const pieno = voci.length >= LIMITE_VOCI;

  return (
    <Card>
      <View style={{ gap: space.xs }}>
        <AppText variant="heading">{sezione.titolo}</AppText>
        <AppText variant="small" tone="secondary">
          {sezione.introduzione}
        </AppText>
      </View>

      {voci.map((voce, indice) => (
        <EntryEditor
          key={voce.chiave}
          voce={voce}
          numero={indice + 1}
          categorie={categorie}
          statoCategorie={statoCategorie}
          errori={{
            idCategoria: fieldErrors[`${sezione.chiave}.${indice}.idCategoria`] ?? null,
            mansione: fieldErrors[`${sezione.chiave}.${indice}.mansione`] ?? null,
          }}
          rimuovibile={allowEmpty || voci.length > 1}
          motivoNonRimuovibile={voci.length === 1 ? sezione.motivoObbligo : null}
          onCambia={(campo, valore) => onCambia(indice, campo, valore)}
          onRimuovi={() => onRimuovi(indice)}
        />
      ))}

      {/* Il pulsante non sparisce mai quando il limite è raggiunto: un comando che
          scompare fa credere che la funzione sia rotta. */}
      <AppButton
        label={sezione.etichettaAggiungi}
        variant="secondary"
        icon="add-outline"
        disabled={pieno}
        onPress={onAggiungi}
      />
      {pieno ? (
        <AppText variant="small" tone="secondary">
          {sezione.testoLimite}
        </AppText>
      ) : null}
    </Card>
  );
}

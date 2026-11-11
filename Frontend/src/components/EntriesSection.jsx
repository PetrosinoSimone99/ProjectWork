import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { EntryEditor } from './EntryEditor';
import { limiteRaggiunto } from '@/services/offer-request';
import { space } from '@/theme/tokens';

/**
 * Una delle due sezioni ripetibili di «cosa offro» / «cosa cerco»: titolo,
 * spiegazione, l'editor della voce e, **solo se la voce non c'è**, il pulsante
 * che la crea. La regola di prodotto (2026-11-11) è una voce per tipo: finché
 * la voce c'è, un comando che ne aggiunge un'altra non deve esistere a schermo
 * — disabilitato si legge come «rotto», e con un tetto di uno non c'è nessun
 * caso in cui possa servire.
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
  const pieno = limiteRaggiunto(voci);

  return (
    <Card>
      <View style={{ gap: space.xs }}>
        <AppText variant="heading">{sezione.titolo}</AppText>
        <AppText variant="small" tone="secondary">
          {sezione.introduzione}
        </AppText>
      </View>

      {/* Le voci sono una lista programmabile (WCAG 1.3.1): ruolo `list` sul
          contenitore e `listitem` su ogni voce, così chi usa uno screen reader
          salta da una voce all'altra (audit UX F19). */}
      {voci.length > 0 ? (
        <View accessibilityRole="list" style={{ gap: space.md }}>
          {voci.map((voce, indice) => (
            <View key={voce.chiave} accessibilityRole="listitem">
              <EntryEditor
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
            </View>
          ))}
        </View>
      ) : null}

      {/* Il comando per aggiungere sparisce quando la voce c'è: con un tetto di
          una voce per tipo l'unico caso in cui serve è la sezione svuotata a
          mano (`allowEmpty`), e lì il pulsante è l'unica via d'uscita. */}
      {pieno ? null : (
        <AppButton
          label={sezione.etichettaAggiungi}
          variant="secondary"
          icon="add-outline"
          onPress={onAggiungi}
        />
      )}
    </Card>
  );
}

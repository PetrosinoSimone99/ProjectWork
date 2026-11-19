import { View } from 'react-native';
import { AppText } from './AppText';
import { Card } from './Card';
import { EntryEditor } from './EntryEditor';
import { space } from '@/theme/tokens';

/**
 * Una delle due sezioni di «cosa offro» / «cosa cerco» in registrazione: titolo,
 * spiegazione e l'editor della voce.
 *
 * **Una voce, sempre, senza comandi intorno.** La regola di prodotto
 * (2026-11-11) è una voce per tipo, e qui la voce è obbligatoria: il backend
 * rifiuta `offers`/`requests` vuoti (`AuthController::validateServices`) e il
 * pulsante che crea l'account resta spento senza. Quindi la sezione non ha né
 * «Aggiungi» (non c'è un secondo posto da raggiungere) né cestino (togliere
 * l'unica voce obbligatoria vorrebbe dire solo riscriverla da zero, perdendo
 * quello che c'era). L'unica via di modifica è `onCambia`.
 *
 * Vive fuori dalla schermata di registrazione perché la schermata resterebbe
 * oltre la soglia di righe indicata dalle regole del progetto. La schermata 2
 * («Offro e cerco») mostra le stesse voci ma con card e comandi propri
 * (`PublicationsSection`), quindi non riusa questo componente.
 *
 * Lo stato non sta qui: voce, errori, categorie e callback arrivano dalla
 * schermata, che è l'unica a sapere cosa sta modificando.
 */
export function EntriesSection({ sezione, voci, categorie, statoCategorie, fieldErrors, onCambia }) {
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
                categorie={categorie}
                statoCategorie={statoCategorie}
                errori={{
                  idCategoria: fieldErrors[`${sezione.chiave}.${indice}.idCategoria`] ?? null,
                  mansione: fieldErrors[`${sezione.chiave}.${indice}.mansione`] ?? null,
                }}
                onCambia={(campo, valore) => onCambia(indice, campo, valore)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

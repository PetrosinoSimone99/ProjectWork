import { View } from 'react-native';
import { AppText } from './AppText';
import { CardServizioCatalogo } from './CardServizioCatalogo';
import { space } from '@/theme/tokens';

/**
 * Una sezione del catalogo: titolo, conteggio e le card dei servizi.
 *
 * Estratta da `(tabs)/index.jsx` (era `SectionList`): non ha stato, riceve
 * l'elenco già nella forma della UI e i callback.
 *
 * **Non** la usa il Loop (lo swipe): quello disegna **una** scheda per volta con
 * la barra delle scelte sotto, quindi non ha un elenco da disegnare. Se un
 * giorno servisse un elenco di servizi altrove, questo è il componente giusto.
 *
 * La chiave è `servizio.chiave` (`${tipo}-${id}`, costruita in `barattolo.js`):
 * non più l'indice della lista, che due annunci omonimi avrebbero confuso
 * (lezione di P37).
 */
export function SezioneServizi({ titolo, voci, categorie, onSelect, style }) {
  if (voci.length === 0) {
    return null;
  }
  return (
    <View style={[{ gap: space.md }, style]}>
      <AppText variant="caption" tone="secondary">
        {titolo} · {voci.length}
      </AppText>
      {voci.map((servizio) => (
        <CardServizioCatalogo
          key={servizio.chiave}
          servizio={servizio}
          categorie={categorie}
          onPress={() => onSelect(servizio)}
        />
      ))}
    </View>
  );
}

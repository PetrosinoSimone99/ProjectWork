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
 * La chiave è `servizio.chiave` (`offerta-<id>`, costruita da
 * `normalizzaOffertaCatalogo`): non più l'indice della lista, che due annunci
 * omonimi avrebbero confuso (lezione di P37). Le categorie non arrivano come
 * prop: ogni riga porta le sue (`servizio.categorie`, già normalizzate).
 */
export function SezioneServizi({ titolo, voci, onSelect, style }) {
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
          onPress={() => onSelect(servizio)}
        />
      ))}
    </View>
  );
}

import { View } from 'react-native';
import { AppText } from './AppText';
import { space } from '@/theme/tokens';

/**
 * L'unico blocco di titolo dell'app (audit UX F89, direzione «A»).
 *
 * Prima di questo componente ogni schermata componeva la propria testata e la
 * seconda riga sotto il titolo era, nove volte su undici, un manuale d'uso
 * («filtra per testo, categoria, area e modalità»). Qui la riga ha un mestiere
 * solo: dire **cosa** la schermata contiene. L'istruzione sta nello stato vuoto,
 * che è il posto in cui serve davvero — quando non c'è niente da leggere.
 *
 * Tre parti, sempre nello stesso ordine: un occhiello facoltativo, il titolo
 * (28, il solo `title` della schermata) e la frase di dati (13, secondaria).
 * Una sola azione in coda: se una schermata ne ha due, una delle due non è
 * primaria e non va qui.
 *
 * `variante="sezione"` è la stessa anatomia per la testata di una collezione
 * dentro la pagina: etichetta e riga dati affiancate, in ruoli secondari. Non
 * dichiara `header` di proposito: la pagina ne ha già uno, e due titoli di pari
 * rango confonderebbero uno screen reader (WCAG 1.3.1, audit UX F19).
 */
export function PageHeader({
  occhiello = null,
  titolo = null,
  frase = null,
  azione = null,
  variante = 'pagina',
  style,
}) {
  if (variante === 'sezione') {
    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: space.sm,
          },
          style,
        ]}
      >
        {titolo ? (
          <AppText variant="label" tone="secondary">
            {titolo}
          </AppText>
        ) : null}
        {frase ? (
          <AppText variant="small" tone="secondary">
            {frase}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[{ gap: space.xs }, style]}>
      {occhiello ? (
        <AppText variant="label" tone="secondary">
          {occhiello}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, gap: space.xs }}>
          {/* `title` è l'unico `header` di primo livello della schermata. */}
          <AppText variant="title" level={1}>
            {titolo}
          </AppText>
          {frase ? (
            <AppText variant="small" tone="secondary">
              {frase}
            </AppText>
          ) : null}
        </View>
        {azione ? <View style={{ flexShrink: 0 }}>{azione}</View> : null}
      </View>
    </View>
  );
}

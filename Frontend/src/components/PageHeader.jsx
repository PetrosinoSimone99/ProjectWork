import { useWindowDimensions, View } from 'react-native';
import { AppText } from './AppText';
import { layout, space, target } from '@/theme/tokens';

/**
 * L'unico blocco di titolo dell'app (audit UX F89, direzione «A»).
 *
 * Prima di questo componente ogni schermata componeva la propria testata e la
 * seconda riga sotto il titolo era, nove volte su undici, un manuale d'uso
 * («filtra per testo, categoria, area e modalità»). Qui la riga ha un mestiere
 * solo: dire **cosa** la schermata contiene. L'istruzione sta nello stato vuoto,
 * che è il posto in cui serve davvero — quando non c'è niente da leggere.
 *
 * Due parti, sempre nello stesso ordine: il titolo (28, il solo `title` della
 * schermata) e la frase di dati (13, secondaria).
 *
 * `indietro` è il tasto di ritorno delle schermate a cui si arriva da un'altra
 * (audit UX F3): sta nella stessa riga del titolo, ma **non lo sposta**. La
 * riga rientra nel gutter della finestra per la larghezza della freccia, così
 * il titolo resta sul bordo del corpo — l'unico bordo sinistro della
 * schermata — invece di cominciare 56 px più a destra. Il rientro vale quanto
 * gutter c'è davvero: `(finestra - misura della colonna) / 2`. A 1280 sono 360
 * px e il titolo è allineato; a 390 il gutter è zero, quindi il rientro è zero
 * e la freccia resta in flusso. Non è un secondo layout mode: è la stessa riga
 * con un margine che si esaurisce dove non c'è spazio per ospitarlo.
 *
 * Il `gap` della riga è `space.md`, esattamente la distanza che il rientro
 * compensa: se cambia uno deve cambiare l'altro.
 *
 * `variante="sezione"` è la stessa anatomia per la testata di una collezione
 * dentro la pagina: etichetta e riga dati affiancate, in ruoli secondari. Non
 * dichiara `header` di proposito: la pagina ne ha già uno, e due titoli di pari
 * rango confonderebbero uno screen reader (WCAG 1.3.1, audit UX F19).
 */
export function PageHeader({
  titolo = null,
  frase = null,
  indietro = null,
  variante = 'pagina',
  style,
}) {
  const { width: larghezzaFinestra } = useWindowDimensions();

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

  // Quanto la riga può rientrare, cioè quanto gutter la finestra lascia fuori
  // dalla colonna: zero sotto la misura di lettura, al massimo una freccia più
  // il `gap` della riga.
  const gutter = Math.max(0, (larghezzaFinestra - layout.maxContent) / 2);
  const rientroIndietro = indietro ? Math.min(target.min + space.md, gutter) : 0;

  return (
    <View style={[{ gap: space.xs }, style]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: space.md,
          marginLeft: -rientroIndietro,
        }}
      >
        {indietro}
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
      </View>
    </View>
  );
}

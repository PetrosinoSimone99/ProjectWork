import { useWindowDimensions, View } from 'react-native';
import { AppText } from './AppText';
import { layout, space, target, useTokens } from '@/theme/tokens';

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
 * schermata — invece di cominciare 56 px più a destra. Il rientro è
 * `min(freccia + gap, gutter)`: a 1280 il gutter è 360 px e il rientro si ferma
 * a 56, quindi il titolo è allineato; a 600 il gutter è 20 e il rientro segue
 * il gutter, senza mandare la freccia fuori dallo schermo; a 390 è zero e la
 * freccia resta in flusso. Non è un secondo layout mode: è la stessa riga con
 * un margine che si esaurisce dove non c'è spazio per ospitarlo.
 *
 * Il `gap` della riga è `space.md`, esattamente la distanza che il rientro
 * compensa: se cambia uno deve cambiare l'altro.
 *
 * `variante="sezione"` è la stessa anatomia per la testata di una collezione
 * dentro la pagina: etichetta e riga dati affiancate, in ruoli secondari. Non
 * dichiara `header` di proposito: la pagina ne ha già uno, e due titoli di pari
 * rango confonderebbero uno screen reader (WCAG 1.3.1, audit UX F19).
 *
 * **La banda di pagina** (direzione UX «A», audit UX F14). Da
 * `layout.sogliaLarga` in su la testata rivendica i gutter: la riga esce dalla
 * colonna per `misura` e arriva ai margini della finestra, con la riga di
 * chiusura in fondo, mentre il corpo resta sulla misura. Sono due telai e uno
 * solo di ciascuno: la finestra per la testata e il chrome (`WebNavMenu`),
 * la misura per il corpo. Sotto la soglia la colonna è la pagina, la banda non
 * esiste e la testata si comporta come sempre.
 *
 * `misura` è la misura della colonna in cui la testata vive: `maxContent` per
 * una schermata di lettura, `maxCatalogo` per il catalogo. Sbagliarla non è un
 * dettaglio estetico: la banda uscirebbe dalla finestra.
 *
 * `banda={false}` è per le schermate centrate (`AuthShell`), dove il modulo è
 * al centro della finestra: una testata appoggiata al telaio sarebbe una
 * seconda composizione dentro la stessa pagina.
 */
export function PageHeader({
  titolo = null,
  frase = null,
  indietro = null,
  variante = 'pagina',
  misura = layout.maxContent,
  banda = true,
  style,
}) {
  const t = useTokens();
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
  const gutter = Math.max(0, (larghezzaFinestra - misura) / 2);
  // Da `sogliaLarga` in su la testata è la banda della pagina e non rientra di
  // una freccia: è già al telaio.
  const conBanda = banda && larghezzaFinestra >= layout.sogliaLarga;
  const rientroIndietro =
    indietro && !conBanda ? Math.min(target.min + space.md, gutter) : 0;

  return (
    <View style={[{ gap: space.xs }, style]}>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: space.md,
            marginLeft: -rientroIndietro,
          },
          // La banda esce dalla colonna per il gutter e si chiude con la riga
          // che separa la pagina dal suo corpo. `marginLeft` esplicito e non
          // `marginHorizontal`: lo shorthand non sovrascriverebbe il
          // `marginLeft: 0` del primo oggetto.
          conBanda && {
            marginLeft: -gutter,
            marginRight: -gutter,
            paddingBottom: space.md,
            borderBottomWidth: 1,
            borderBottomColor: t.border,
          },
        ]}
      >
        {indietro}
        <View style={{ flex: 1, gap: space.xs }}>
          {/* `title` è l'unico `header` di primo livello della schermata. */}
          {titolo ? (
            <AppText variant="title" level={1}>
              {titolo}
            </AppText>
          ) : null}
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

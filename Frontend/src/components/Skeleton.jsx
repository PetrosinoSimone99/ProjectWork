import { View } from 'react-native';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Blocchi grigi che riservano la forma del contenuto in arrivo.
 *
 * Il backend risponde in circa 4 secondi (audit 2026-11-18 §3, «Performance»):
 * uno spinner vuoto non dice né quanto manca né cosa sta arrivando, e la
 * schermata sembra rotta. Un blocco che ha già la forma e la misura della riga
 * che comparirà dice «sta arrivando una lista», e quando la lista arriva il
 * contenuto non salta: l'ingombro era già quello.
 *
 * **Statico, non animato.** Non c'è shimmer: un blocco fermo è più semplice,
 * costa zero frame su una superficie che resta in scena proprio mentre il
 * dispositivo aspetta la rete, e non c'è nessuna animazione autonoma da ridurre
 * per chi ha chiesto «Riduci movimento» — il rispetto della preferenza qui è
 * totale perché la scelta è non muovere niente. Se un giorno servisse un
 * passaggio di opacità, dovrà leggere `useReducedMotion` e usare solo opacità
 * con `useNativeDriver: true`.
 *
 * **Decorativo.** È la stessa regola di `AppIcon` e del sipario di `ModalShell`:
 * i blocchi non aggiungono informazione a chi non li vede, e un albero di `View`
 * vuote annunciato dallo screen reader è solo rumore. Si passano insieme le
 * props native (`accessibilityElementsHidden`, `importantForAccessibility`) e
 * quelle `aria-*` che legge `react-native-web`, perché una sola delle due
 * famiglie lascia l'altra piattaforma scoperta.
 *
 * Il grigio è `t.border`, il tono quieto che i due temi hanno già in comune:
 * nessun letterale, e nessun token nuovo per una superficie che dura un attimo.
 */
const NASCOSTO = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  'aria-hidden': true,
  focusable: false,
};

/** Un blocco grigio: `larghezza`/`altezza` in punti, `raggio` dal set di token. */
function Blocco({ larghezza, altezza, raggio }) {
  const t = useTokens();
  return (
    <View style={{ width: larghezza, height: altezza, borderRadius: raggio, backgroundColor: t.border }} />
  );
}

/**
 * `righe` blocchi impilati, uno per riga di testo che arriverà.
 *
 * `compatta` stringe la pila (altezza e distanza minori) per un posto dentro una
 * card già disegnata, dove il contenuto in arrivo è una didascalia e non una
 * sezione. Il contenitore non ha una larghezza propria: la prende da chi lo
 * monta, come ogni altro elemento della colonna di `Screen`.
 */
export function Skeleton({ larghezza = '100%', altezza, raggio = radius.checkbox, righe = 1, compatta = false }) {
  const altezzaBlocco = altezza ?? (compatta ? 10 : 14);
  return (
    <View {...NASCOSTO} style={{ width: '100%', gap: compatta ? space.xs : space.sm }}>
      {Array.from({ length: righe }, (_, indice) => (
        <Blocco key={indice} larghezza={larghezza} altezza={altezzaBlocco} raggio={raggio} />
      ))}
    </View>
  );
}

/**
 * La lista che arriverà: `righe` righe con la stessa forma di una riga vera —
 * il tondo a sinistra e due righe di testo a destra.
 *
 * È la sagoma di `ServiceCard`/`QueueCard` alla scala che serve a dire «sta
 * arrivando un elenco» senza anticipare quali voci: nessun testo, nessuna icona,
 * quindi niente da leggere e niente da tradurre.
 */
export function SkeletonLista({ righe = 3, compatta = false }) {
  const t = useTokens();
  return (
    <View {...NASCOSTO} style={{ width: '100%', gap: compatta ? space.sm : space.md }}>
      {Array.from({ length: righe }, (_, indice) => (
        <View
          key={indice}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            padding: compatta ? space.md : space.lg,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.card,
            backgroundColor: t.surface,
          }}
        >
          <Blocco larghezza={40} altezza={40} raggio={radius.pill} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Skeleton larghezza="70%" compatta />
            <Skeleton larghezza="45%" compatta />
          </View>
        </View>
      ))}
    </View>
  );
}

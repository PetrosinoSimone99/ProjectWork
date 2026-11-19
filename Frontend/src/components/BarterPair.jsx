import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { space } from '@/theme/tokens';

/**
 * Le due direzioni di uno scambio, nell'ordine in cui si leggono: prima quello
 * che questa persona offre, poi quello che riceve.
 *
 * L'ordine è una costante e non una scelta del chiamante: uno scambio è
 * direzionale, e due lati disegnati in ordine diverso in due punti dell'app
 * raccontano due scambi diversi.
 */
const DIREZIONI = [
  { chiave: 'offre', etichetta: 'Offre' },
  { chiave: 'riceve', etichetta: 'Riceve' },
];

/**
 * I due ruoli tipografici per lato, una scala sotto la misura normale quando lo
 * scambio sta dentro una card: la variante compatta non cambia cosa si vede,
 * solo quanto è grande e quanto respira.
 */
const TIPI = {
  ampia: { nome: 'body', cosa: 'small' },
  compatta: { nome: 'small', cosa: 'label' },
};

/**
 * Una riga per direzione: l'etichetta dice se quel che segue si offre o si
 * riceve, il nome dice a chi, `cosa` dice cosa — e se `cosa` non c'è non si
 * scrive niente al suo posto.
 */
export function BarterPair({ direzioni, compatta = false }) {
  const lati = DIREZIONI.map(({ chiave, etichetta }) => ({
    etichetta,
    lato: direzioni?.[chiave] ?? null,
  })).filter(({ lato }) => lato !== null);

  if (lati.length === 0) return null;

  const tipi = compatta ? TIPI.compatta : TIPI.ampia;

  return (
    <View style={[stili.contenitore, compatta && stili.contenitoreCompatta]}>
      {lati.map(({ etichetta, lato }) => (
        <View
          key={etichetta}
          accessible
          accessibilityLabel={etichettaAccessibile(etichetta, lato)}
          style={[stili.riga, compatta && stili.rigaCompatta]}
        >
          <AppText variant="label" tone="secondary" style={stili.etichetta}>
            {etichetta}
          </AppText>
          <View style={stili.contenuto}>
            {lato.chi ? <AppText variant={tipi.nome}>{conChiocciola(lato.chi)}</AppText> : null}
            {lato.cosa ? (
              <AppText variant={tipi.cosa} tone="secondary">
                {lato.cosa}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Il nome si legge come un handle: una chiocciola sola, anche se arriva già. */
function conChiocciola(chi) {
  return chi.startsWith('@') ? chi : `@${chi}`;
}

/**
 * La riga intera è un solo nodo per uno screen reader: l'etichetta («Offre»),
 * il nome e la cosa in una frase sola, così la direzione non si perde fra un
 * testo e l'altro.
 */
function etichettaAccessibile(etichetta, lato) {
  const testa = lato.chi ? `${etichetta} ${conChiocciola(lato.chi)}` : etichetta;
  return lato.cosa ? `${testa}: ${lato.cosa}` : testa;
}

/**
 * `minWidth` sull'etichetta è un minimo, non una misura: le due parole hanno
 * lunghezze diverse («Offre», «Riceve») e senza una base comune i due contenuti
 * partirebbero da due x diverse, che è esattamente illeggibile in una coppia.
 * Essendo un minimo, un testo ingrandito allarga l'etichetta invece di tagliarla.
 */
const stili = StyleSheet.create({
  contenitore: { gap: space.sm },
  contenitoreCompatta: { gap: space.xs },
  riga: { flexDirection: 'row', alignItems: 'flex-start', columnGap: space.sm },
  rigaCompatta: { columnGap: space.xs },
  etichetta: { flexShrink: 0, minWidth: 52 },
  contenuto: { flexShrink: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xs },
});

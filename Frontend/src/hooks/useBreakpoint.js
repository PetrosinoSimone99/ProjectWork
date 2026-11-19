import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { layout } from '@/theme/tokens';

/**
 * Le classi in ordine crescente di soglia: l'ordine viene dalle soglie in
 * `layout.sizeClasses`, non da un secondo elenco da tenere allineato a mano.
 * Calcolato una volta, all'import.
 */
const classiPerSoglia = Object.entries(layout.sizeClasses).sort((a, b) => a[1] - b[1]);

/**
 * La classe di dimensione di una larghezza, in px: `'compact' | 'medium' |
 * 'expanded'`.
 *
 * Funzione pura della sola larghezza, senza piattaforma dentro: è la regola che
 * l'hook applica alla finestra, esposta a parte perché la si possa provare (e
 * leggere) senza montare un componente. Le soglie sono **inclusive** sul loro
 * limite: 600 è `medium`, 599 è ancora `compact` (vedi `layout.sizeClasses`).
 */
export function sizeClassForWidth(width) {
  let classe = classiPerSoglia[0][0];
  for (const [nome, soglia] of classiPerSoglia) {
    if (width >= soglia) {
      classe = nome;
    }
  }
  return classe;
}

/**
 * In che classe di dimensione sta la finestra, **su ogni piattaforma**.
 *
 * È il lettore unico delle soglie di `layout.sizeClasses`: nessun componente
 * confronta più larghezze con numeri propri, e nessuno si nasconde dietro
 * `Platform.OS === 'web'` per accorgersi che un tablet ha spazio (audit
 * P2 nativo, adattività 2/4: un iPad disegnava la colonna da 560 di un telefono
 * al centro di una superficie grande).
 *
 * Restituisce `{ classe, larghezza }`: la classe serve a chi sceglie il layout,
 * la larghezza grezza a chi ha ancora bisogno di una misura continua (un
 * rientro, un gutter) senza ricalcolarla.
 *
 * L'oggetto è memoizzato sulla larghezza e non ricreato a ogni render: così chi
 * lo mette in una dipendenza non riapre un effetto a ogni passaggio. La classe è
 * una funzione pura della larghezza, quindi la sola dipendenza che conta è lei;
 * `useWindowDimensions` dà la larghezza e si riaggiorna da sé a rotazione e su
 * cambio di finestra, che è l'unico altro modo in cui questo valore cambia.
 */
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  const classe = sizeClassForWidth(width);

  return useMemo(() => ({ classe, larghezza: width }), [classe, width]);
}

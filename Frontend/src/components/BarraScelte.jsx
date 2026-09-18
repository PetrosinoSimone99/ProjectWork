import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { SCELTE_CANDIDATO } from '@/servizi/candidati';
import { nomePersona } from '@/servizi/offerta-ricerca';
import { space } from '@/theme/tokens';

/**
 * I due pulsanti della scheda, il contatore e la riga che spiega il gesto.
 *
 * È il canale **accessibile** dello swipe: il gesto non è annunciabile (un
 * lettore di schermo non lo vede e non lo può fare), quindi tutto quello che il
 * trascinamento fa si fa anche da qui — e la riga di aiuto **dice** che il gesto
 * esiste, così chi non lo vede lo scopre lo stesso. La riga resta sempre
 * visibile: non è un tutorial da mostrare una volta e dimenticare (richiederebbe
 * uno stato e una persistenza per dire meno).
 *
 * Le etichette accessibili nominano **persona e offerta** («Mi interessa
 * l'offerta «Analisi 1» di Luca Bianchi»): in una pila di schede ripetute un
 * «Passa» nudo non dice niente.
 *
 * Il contatore è anche la **regione viva** del cambio scheda: è il cambiamento
 * più importante della schermata e altrimenti sarebbe silenzioso. Una sola
 * regione viva qui (l'altra è il `Banner` dell'esito, che ce l'ha già): due
 * annunci per scelta, non cinque.
 */
export function BarraScelte({
  candidato,
  azioni,
  numeroScheda,
  totale,
  descrizione,
  inCorso = null,
  disabilitato = false,
  motivoDisabilitato = null,
  onInteressa,
  onPassa,
}) {
  const persona = candidato.persona ?? {};
  const nome = nomePersona(persona);
  const mansione = candidato.offerta?.mansione?.trim() || 'mansione non indicata';

  const etichettaPositiva = candidato.tiHaScelto
    ? `Accetta il like di ${nome}`
    : `Mi interessa l'offerta «${mansione}» di ${nome}`;
  const etichettaNegativa = candidato.tiHaScelto
    ? `Rifiuta l'offerta di ${nome}`
    : `Passa all'offerta successiva (${mansione} di ${nome})`;

  const occupato = inCorso !== null;
  const bloccato = disabilitato || occupato;

  return (
    <View style={{ gap: space.md }}>
      <AppText
        variant="small"
        tone="secondary"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Scheda ${numeroScheda} di ${totale}. ${descrizione}`}
      >
        {`${numeroScheda} di ${totale}`}
      </AppText>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {/* «Passa» non è `danger`: rinunciare a una scheda non distrugge niente,
            e il tono `danger` è per le azioni distruttive. La parola scritta e
            l'icona bastano. */}
        <AppButton
          label={azioni.negativa}
          variant="secondary"
          icon="close-outline"
          disabled={bloccato}
          loading={inCorso === SCELTE_CANDIDATO.PASSA}
          onPress={onPassa}
          accessibilityLabel={etichettaNegativa}
          style={{ flex: 1 }}
        />
        <AppButton
          label={azioni.positiva}
          icon="heart-outline"
          disabled={bloccato}
          loading={inCorso === SCELTE_CANDIDATO.INTERESSE}
          onPress={onInteressa}
          accessibilityLabel={etichettaPositiva}
          style={{ flex: 1 }}
        />
      </View>

      {motivoDisabilitato ? (
        <AppText variant="small" tone="danger">
          {motivoDisabilitato}
        </AppText>
      ) : null}

      <AppText variant="small" tone="secondary">
        Trascina la scheda a destra per dire che ti interessa, a sinistra per passare. Oppure usa i
        pulsanti.
      </AppText>
    </View>
  );
}

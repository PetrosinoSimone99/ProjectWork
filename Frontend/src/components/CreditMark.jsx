import { View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { radius, space, target, useTokens } from '@/theme/tokens';

/**
 * A che cosa serve il saldo quando è zero: la via d'uscita, non la constatazione.
 *
 * Il backend rimborsa il credito di una coda di **ricerca** annullata
 * (`refundsCredit` in `match.jsx`), quindi la frase è vera in ogni stato in cui
 * compare: dice come si torna ad averne uno, e non promette un acquisto che il
 * prodotto non ha.
 */
const ZERO_CREDIT_NEXT_STEP =
  'Senza crediti la ricerca resta spenta: un credito torna se annulli una coda di ricerca.';

/**
 * Il saldo come **marchio di dato**, non come nota a piè di pagina.
 *
 * Il numero decide se le azioni che lo spendono possono partire, ed era l'unico
 * dato di `/match` senza superficie: una riga di testo grigio appoggiata fra due
 * blocchi (F1 del ciclo del 2026-11-19). Qui prende la stessa anatomia dei marchi
 * che stanno dentro le card — una riga sola, icona + etichetta + valore — e
 * un'altezza da controllo, perché il saldo si legge a colpo d'occhio accanto ai
 * pulsanti che lo spendono. È lo stesso oggetto su `/match` e su `/profile`:
 * `CreditMark` non si duplica, e `docs/DESIGN.md` (sezione «Marchio di dato»)
 * è la pagina che ne fissa anatomia, altezza e regola della superficie.
 *
 * **Nessun accento**: il credito non è l'azione primaria e la regola dell'accento
 * resta sui pulsanti. A saldo zero il segnale è testo (`t.danger`) più la frase
 * che dice come si torna ad averne uno — un riempimento rosso direbbe «errore»
 * dove c'è solo un dato.
 *
 * La superficie è `t.surface`, non `t.background`: il marchio vive **sulla
 * pagina**, il cui fondo è `t.background`, e un marchio dello stesso colore del
 * foglio non avrebbe né forma né bordo. Il bordo sottile è quello dei controlli,
 * così la forma si legge anche a tema scuro senza aggiungere un colore nuovo
 * alla tavolozza.
 *
 * Il numero è già nel testo del marchio: nessun ruolo ARIA in più, e nessuna
 * regione viva — un saldo che cambia dopo un'azione lo dice il banner dell'esito,
 * non una lettura fuori tempo.
 */
export function CreditMark({ saldo }) {
  const t = useTokens();
  const senzaCrediti = saldo === 0;
  return (
    <View style={{ gap: space.xs, alignSelf: 'flex-start' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          alignSelf: 'flex-start',
          backgroundColor: t.surface,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: radius.input,
          paddingHorizontal: space.sm,
          minHeight: target.min,
        }}
      >
        <AppIcon name="ticket-outline" size={16} color={t.textSecondary} />
        <AppText variant="small" tone="secondary">
          Crediti disponibili
        </AppText>
        <AppText
          variant="label"
          tone={senzaCrediti ? 'danger' : 'default'}
          // Cifre a larghezza fissa: due saldi diversi occupano la stessa riga e
          // il marchio non balla da una quotazione all'altra.
          style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}
        >
          {String(saldo)}
        </AppText>
      </View>
      {senzaCrediti ? (
        <AppText variant="small" tone="danger">
          {ZERO_CREDIT_NEXT_STEP}
        </AppText>
      ) : null}
    </View>
  );
}

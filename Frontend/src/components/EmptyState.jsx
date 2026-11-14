import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Gli stati «niente da mostrare», con **una sola anatomia** (direzione UX «A»,
 * audit UX F86): icona, titolo, una frase che dice cosa riempirebbe questo
 * spazio, e un'azione **solo quando ne esiste una vera**.
 *
 * Prima erano tre forme diverse per lo stesso momento — un blocco con la CTA,
 * un blocco senza, e una riga di testo senza niente — e la scelta spettava a chi
 * chiamava, che la faceva undici volte in modo diverso. Ora la forma è questa e
 * basta: cambiano solo i contenuti.
 *
 * Due regole che il componente non viola:
 *
 * - **Non inventa azioni.** La CTA arriva da fuori (`etichettaAzione` +
 *   `onAzione`) e compare solo se ci sono entrambe. «Proposte inviate» ha una via
 *   d'uscita e la mostra; il match automatico non ce l'ha, dice perché e si
 *   ferma lì.
 * - **Non inventa un'icona.** Chi non ne passa una ottiene la stessa anatomia
 *   senza il disco: `icon` è facoltativa e il disco compare solo con lei.
 *
 * La vecchia prop `variante` (`dati` / `mercato` / `non-disponibile`) non esiste
 * più: i punti di chiamata che la passavano non ottenevano niente di diverso, ed
 * è voluto — due di loro le passavano anche un'azione che la variante scartava.
 * Dalla passata di rifinitura del 2026-11-14 non la passa più nessuno dei sette
 * (audit UX F15): una forma sola, nessun parametro che non fa niente.
 */
export function EmptyState({ icon = null, title, description, etichettaAzione = null, onAzione = null }) {
  const t = useTokens();
  const conAzione = Boolean(etichettaAzione && onAzione);

  return (
    <View
      style={{
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.xxl,
        paddingHorizontal: space.xl,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.borderInput,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Icona decorativa: nessun `label`, quindi nascosta agli AT (F22). */}
          <AppIcon name={icon} size={26} color={t.textSecondary} />
        </View>
      ) : null}
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
        {description}
      </AppText>
      {conAzione ? (
        // CTA: è l'azione che risolve (o aggiorna) il vuoto. Se non c'è, lo stato
        // vuoto lo dice con le parole e non finge un comando.
        <AppButton
          label={etichettaAzione}
          onPress={onAzione}
          style={{ marginTop: space.xs }}
        />
      ) : null}
    </View>
  );
}

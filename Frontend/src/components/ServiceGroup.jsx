import { View } from 'react-native';
import { AppIcon } from '@/components/AppIcon';
import { AppText } from '@/components/AppText';
import { space, useTokens } from '@/theme/tokens';

/**
 * One group of published services: a heading (icon + title), one row per
 * publication (`- descrizione`, a single line) and, only when the list is cut,
 * how many rows the cut left out.
 *
 * `limite` is the caller's decision about length, and it is the whole difference
 * between the two places that draw this group: the mini card inside the service
 * detail caps the rows and counts the rest, the public profile shows everything
 * and has nothing to count. Hence a numeric `limite` draws that many rows plus
 * «e N altre», `limite={null}` draws all of them and no counter at all — a
 * counter over a list nobody truncated would be a lie.
 *
 * `servizi` rows are normalised publications (`{chiave, descrizione}`); the key
 * is the row's own because `/offers/{id}` and `/requests/{id}` are two separate
 * id sequences. An empty, null or absent list draws nothing, so the caller never
 * has to ask whether a group is worth rendering.
 */
export function ServiceGroup({ titolo, icona, servizi, limite = 3 }) {
  const t = useTokens();
  if (!Array.isArray(servizi) || servizi.length === 0) {
    return null;
  }
  const visibili = limite === null ? servizi : servizi.slice(0, limite);
  const resto = servizi.length - visibili.length;

  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <AppIcon name={icona} size={14} color={t.textSecondary} />
        <AppText variant="small" style={{ fontWeight: '600' }}>
          {titolo}
        </AppText>
      </View>
      {visibili.map((servizio) => (
        <AppText key={servizio.chiave} variant="small" tone="secondary" numberOfLines={1}>
          {`- ${servizio.descrizione}`}
        </AppText>
      ))}
      {resto > 0 ? (
        <AppText variant="small" tone="secondary">
          {`e ${resto} altr${resto === 1 ? 'a' : 'e'}`}
        </AppText>
      ) : null}
    </View>
  );
}

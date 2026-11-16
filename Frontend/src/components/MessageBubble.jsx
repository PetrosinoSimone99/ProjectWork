import { View } from 'react-native';
import { AppText } from './AppText';
import { formatIsoDateTime } from '@/services/dates';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * One chat message bubble of the agreement chat, own side and other side.
 *
 * Data only: the bubble draws the `messaggio` row that
 * `normalizeChatMessage` already shaped (`{id, chatId, autore, testo,
 * inviatoIl}`) against the session username; no network, no router, no
 * mutation of the prop.
 *
 * The author decides the side. When `messaggio.autore === myUsername` the
 * bubble sits on the right over `serviceBg` with `serviceText` ink and the
 * name reads «Tu»; otherwise it sits on the left over `surface` with the
 * `borderInput` outline and the name reads `@<autore>`. A row whose `autore`
 * is null draws no name at all: an unknown author is not replaced with an
 * invented placeholder.
 *
 * The time is `formatIsoDateTime` in the small secondary role, drawn only
 * when it formats — a missing or unparseable `inviatoIl` leaves the bubble
 * without a time instead of showing a wrong one. The bubble caps at
 * `maxWidth: '100%'` of the column, so a long message wraps inside it and
 * never widens past the chat column.
 */
export function MessageBubble({ messaggio, myUsername }) {
  const t = useTokens();
  const mio = messaggio.autore === myUsername;
  const ora = formatIsoDateTime(messaggio.inviatoIl);
  // Own ink: the whole bubble speaks in the service tone, name included.
  const inchiostro = mio ? { color: t.serviceText } : undefined;

  const nome = mio ? 'Tu' : messaggio.autore !== null ? `@${messaggio.autore}` : null;

  return (
    <View style={{ alignItems: mio ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          backgroundColor: mio ? t.serviceBg : t.surface,
          borderColor: t.borderInput,
          borderWidth: mio ? 0 : 1,
          borderRadius: radius.card,
          gap: space.xs,
          maxWidth: '100%',
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
        }}
      >
        {nome !== null ? (
          <AppText variant="label" tone="secondary" style={inchiostro}>
            {nome}
          </AppText>
        ) : null}

        <AppText style={inchiostro}>{messaggio.testo}</AppText>

        {ora !== null ? (
          <AppText variant="small" tone="secondary">
            {ora}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

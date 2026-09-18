import { View } from 'react-native';
import { AppText } from './AppText';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Una bolla della conversazione: il messaggio e, quando la data è leggibile,
 * l'ora dell'invio. A destra e a tinta piena se il messaggio è mio, a sinistra e
 * col bordo negli altri casi (la «coda» della bolla da cui parte il messaggio
 * è il vertice che distingue i due lati).
 *
 * È **puro**: non conosce la rete né la sessione, sa solo disegnare il messaggio
 * che riceve. `isOwn` glielo dice il chiamante, che è l'unico a conoscere l'id
 * dell'utente collegato.
 */
export function MessageBubble({ message, isOwn }) {
  const t = useTokens();
  const createdAt = formatMessageTime(message.data_creazione);

  return (
    <View style={{ alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: space.sm }}>
      <View
        style={{
          maxWidth: '78%',
          backgroundColor: isOwn ? t.primary : t.surface,
          borderColor: isOwn ? t.primary : t.border,
          borderWidth: isOwn ? 0 : 1,
          borderRadius: radius.input,
          borderBottomRightRadius: isOwn ? space.xs : radius.input,
          borderBottomLeftRadius: isOwn ? radius.input : space.xs,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
        }}
      >
        <AppText style={{ color: isOwn ? t.onPrimary : t.text, flexShrink: 1 }}>
          {message.messaggio}
        </AppText>
        {createdAt ? (
          <AppText
            variant="small"
            style={{
              color: isOwn ? t.onPrimary : t.textSecondary,
              opacity: 0.8,
              alignSelf: 'flex-end',
            }}
          >
            {createdAt}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/**
 * L'ora di un messaggio, o stringa vuota se la data non è utilizzabile: il
 * backend manda `"YYYY-MM-DD HH:MM:SS"` (spazio, non `T`) e non è detto che il
 * campo ci sia sempre, quindi una data assente o malformata **non** fa fallire
 * il disegno della bolla, la lascia senza orario.
 */
function formatMessageTime(value) {
  if (typeof value !== 'string' || value.length < 16) {
    return '';
  }

  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

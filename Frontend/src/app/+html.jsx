import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * Il guscio HTML del build web.
 *
 * `lang="it"` è WCAG 3.1.1 (livello A) e mancava: senza, il browser annuncia un
 * testo italiano con la voce che ha scelto lui (audit UX F20). Il resto è il
 * template documentato di Expo Router: viewport, meta di compatibilità e il
 * reset della `ScrollView`. `+html` viene usato solo sul web e non tocca iOS,
 * Android né Expo Go.
 */
export default function Root({ children }) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

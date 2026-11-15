import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

/**
 * Il guscio HTML del build web.
 *
 * `lang="it"` è WCAG 3.1.1 (livello A) e mancava: senza, il browser annuncia un
 * testo italiano con la voce che ha scelto lui (audit UX F20). `+html` viene
 * usato solo sul web e non tocca iOS, Android né Expo Go.
 *
 * `useServerDocumentContext()` non è un dettaglio: da Expo Router 58 il guscio
 * deve rendere `headNodes` e `bodyNodes`, ed è **dentro `bodyNodes`** che il
 * framework mette i tag `<script>` del bundle. Un `+html` scritto per la
 * versione precedente (solo `{children}`, senza il contesto) produce un HTML
 * senza JS: la pagina resta sul placeholder di avvio e non idrata mai. Il
 * template di riferimento vive in
 * `node_modules/expo/node_modules/@expo/cli/static/template/+html.tsx`.
 * Gli attributi arrivano da `htmlAttributes`/`bodyAttributes` per lo stesso
 * motivo: sono il punto in cui il framework aggiunge le sue classi e i suoi
 * marcatori.
 */
export default function Root({ children }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="it" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

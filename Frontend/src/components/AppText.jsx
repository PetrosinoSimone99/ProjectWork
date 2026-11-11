import { Text } from 'react-native';
import { useTokens } from '@/theme/tokens';

/**
 * La scala tipografica, una volta sola.
 *
 * Ogni variante è un **ruolo**, non una misura: se una schermata ha bisogno di
 * un corpo diverso, il corpo manca qui e va aggiunto qui (audit UX F37). Le
 * varianti che aprono una sezione di contenuto sono anche `header`, così la
 * gerarchia disegnata ha un corrispondente programmatico e uno screen reader
 * può saltare da un titolo all'altro (WCAG 1.3.1, audit UX F19).
 *
 * Sei ruoli, dopo la direzione UX del 2026-11-11 (audit UX F47, F48):
 *
 * - `title` 28/700 — il titolo di una schermata, uno per schermata.
 * - `heading` 19/700 — il titolo di una sezione o di una card.
 *
 * I due ruoli che c'erano in più non ci sono più: `display` (30) è diventato
 * `title` e `subheading` (17) è stato assorbito da `heading`, in tutti i punti
 * di chiamata. Una misura in meno è una decisione in meno.
 * - `body` 15 — il testo corrente.
 * - `small` 13 — la riga secondaria: dati sotto un titolo, meta di una card.
 * - `label` 12/600 — una parola che etichetta qualcosa senza urlare: occhiello
 *   di una testata, prosa breve in un modulo. È il ruolo che l'audit chiedeva
 *   per i testi che stavano in `caption` senza essere pillole (F48).
 * - `caption` 11/700 maiuscolo spaziato — solo per pillole, chip e la riga di
 *   conteggio: è un'etichetta di interfaccia, non un testo da leggere.
 */
const VARIANTS = {
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 34 },
  heading: { fontSize: 19, fontWeight: '700', letterSpacing: -0.2, lineHeight: 25 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  caption: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
};

/** Le varianti che sono un titolo: ruolo `header` di default (WCAG 1.3.1). */
const HEADING_VARIANTS = new Set(['title', 'heading']);

/**
 * La profondità predefinita di ogni ruolo che è un titolo: il titolo di una
 * schermata è la radice della sua pagina, un titolo di sezione sta un passo
 * sotto.
 */
const LIVELLO_PREDEFINITO = { title: 1, heading: 2 };

/**
 * Testo con gerarchia e colore del tema già applicati.
 *
 * `accessibilityRole` si può sempre sovrascrivere dal chiamante: una variante
 * `heading` usata per una riga che non apre niente (`accessibilityRole: 'text'`) non deve diventare un titolo.
 *
 * `level` dichiara la profondità del titolo (audit UX F51), e il default segue
 * il ruolo invece di essere uno solo per tutti: un `title` è la radice della sua
 * pagina (1), un `heading` sta un passo sotto (2). Prima il default era 2 per
 * ogni ruolo, quindi ogni schermata che non passava `level={1}` non aveva nessun
 * titolo di primo livello, e sette rotte su dieci ne erano senza. Il ruolo
 * `header` da solo dice che una riga è un titolo ma non dice di cosa, e uno
 * screen reader non può ricostruire la gerarchia. Viaggia su `aria-level`
 * — la sola proprietà che react-native-web e il nativo leggono allo stesso modo
 * — e vale solo sulle varianti che sono un titolo. Chi ha bisogno di una
 * profondità diversa dalla sua (il titolo di un pannello è la radice del suo
 * dialogo) la dichiara.
 */
export function AppText({ variant = 'body', tone = 'default', level, style, ...props }) {
  const t = useTokens();
  const ruolo = VARIANTS[variant] ? variant : 'body';
  const eTitolo = HEADING_VARIANTS.has(ruolo);
  const livello = level ?? LIVELLO_PREDEFINITO[ruolo] ?? 2;
  const colors = {
    default: t.text,
    secondary: t.textSecondary,
    primary: t.primary,
    danger: t.danger,
    onPrimary: t.onPrimary,
    accent: t.accentText,
  };
  return (
    <Text
      accessibilityRole={eTitolo ? 'header' : undefined}
      aria-level={eTitolo ? livello : undefined}
      style={[VARIANTS[ruolo], { color: colors[tone] }, style]}
      {...props}
    />
  );
}

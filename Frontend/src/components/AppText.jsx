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

/**
 * Ruoli ritirati da F47 (`display` 30 → `title`, `subheading` 17 → `heading`).
 *
 * Restano qui come alias finché i loro punti di chiamata non si spostano
 * (`(tabs)/profile.jsx`, `StaffUserCard.jsx`): rimuovere il ruolo e lasciare la
 * chiamata viva renderebbe il testo senza misura, che è peggio di un nome in
 * più. Il nome sparisce nella stessa modifica che ripulisce le chiamate — il
 * ruolo effettivo, nel frattempo, è già quello nuovo.
 */
const RUOLI_RITIRATI = { display: 'title', subheading: 'heading' };

/** Le varianti che sono un titolo: ruolo `header` di default (WCAG 1.3.1). */
const HEADING_VARIANTS = new Set(['title', 'heading']);

/**
 * Testo con gerarchia e colore del tema già applicati.
 *
 * `accessibilityRole` si può sempre sovrascrivere dal chiamante: una variante
 * `heading` usata per una riga che non apre niente (`accessibilityRole: 'text'`) non deve diventare un titolo.
 */
export function AppText({ variant = 'body', tone = 'default', style, ...props }) {
  const t = useTokens();
  const ruolo = VARIANTS[variant] ? variant : (RUOLI_RITIRATI[variant] ?? 'body');
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
      accessibilityRole={HEADING_VARIANTS.has(ruolo) ? 'header' : undefined}
      style={[VARIANTS[ruolo], { color: colors[tone] }, style]}
      {...props}
    />
  );
}

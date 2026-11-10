import { FlatList, Platform, RefreshControl, View } from 'react-native';
import { AppText } from './AppText';
import { ServiceCard } from './ServiceCard';
import { space, useTokens } from '@/theme/tokens';

/**
 * Il catalogo della home: riga di titolo con il conteggio, testata della
 * schermata e le card dei servizi in una `FlatList`.
 *
 * Estratta da `(tabs)/index.jsx` (era `SectionList` dentro la `ScrollView` di
 * `Screen`): ora la lista è la pagina — `Screen` non scrolla più e il
 * pull-to-refresh sta sulla `FlatList` (audit UX F42), così le righe non
 * crescono più con «Carica altri» dentro un unico contenuto infinito. La
 * testata della schermata (titolo, filtri, avvisi) arriva da fuori come
 * `testata` (`ListHeaderComponent`) e scorre insieme ai risultati; `vuoto` è
 * ciò che la lista disegna quando non ci sono righe (primo caricamento, zero
 * risultati) e `coda` ciò che sta sotto («Carica altri»).
 *
 * Tre dettagli non decorativi:
 *
 * 1. **La riga di conteggio è la regione viva** (`accessibilityLiveRegion
 *    "polite"`, audit UX F21): è sempre montata (la lista lo è sempre) e il
 *    suo testo cambia con il conteggio dei risultati e con la pagina aggiunta,
 *    così filtrare e «Carica altri» vengono annunciati da una sola regione.
 * 2. **Il numero viene dal payload** (audit UX F32): «N di M» usa
 *    `paginazione.elementiTotali`; senza payload la riga resta solo con il
 *    titolo, senza un numero che cambia significato.
 * 3. **Ruoli di lista** (`accessibilityRole` `list`/`listitem`, audit UX F19):
 *    la `FlatList` è la collezione, ogni card sta nella propria riga di lista.
 *
 * La chiave è `servizio.chiave` (`offerta-<id>`, costruita da
 * `normalizzaOffertaCatalogo`): non più l'indice della lista, che due annunci
 * omonimi avrebbero confuso (lezione di P37). Le categorie non arrivano come
 * prop: ogni riga porta le sue (`servizio.categorie`, già normalizzate).
 */
export function ServicesSection({
  titolo,
  paginazione = null,
  voci,
  testata = null,
  vuoto = null,
  coda = null,
  refreshing = false,
  onRefresh = null,
  onSelect,
  style,
}) {
  const t = useTokens();
  // Stesso gate di `Screen`: il pull-to-refresh è un gesto nativo, sul web la
  // `ScrollView` lo ignorerebbe.
  const aggiornamentoAttivo = Platform.OS !== 'web' && typeof onRefresh === 'function';

  const totale = paginazione?.elementiTotali ?? null;
  const pagina = paginazione?.pagina ?? null;
  const pagineTotali = paginazione?.pagineTotali ?? null;
  const conteggio = totale === null ? '' : ` · ${voci.length} di ${totale}`;
  const paginaAggiunta =
    pagina !== null && pagina > 1 && pagineTotali !== null
      ? ` — pagina ${pagina} di ${pagineTotali}`
      : '';

  return (
    <FlatList
      style={[{ flex: 1 }, style]}
      contentContainerStyle={{ gap: space.lg, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      data={voci}
      keyExtractor={(servizio) => servizio.chiave}
      accessibilityRole="list"
      renderItem={({ item: servizio }) => (
        <View accessibilityRole="listitem">
          <ServiceCard servizio={servizio} onPress={() => onSelect(servizio)} />
        </View>
      )}
      ListHeaderComponent={
        <View style={{ gap: space.lg }}>
          {testata}
          <View accessibilityLiveRegion="polite">
            <AppText variant="caption" tone="secondary">
              {titolo}
              {conteggio}
              {paginaAggiunta}
            </AppText>
          </View>
        </View>
      }
      ListEmptyComponent={vuoto}
      ListFooterComponent={coda}
      refreshControl={
        aggiornamentoAttivo ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.primary}
            colors={[t.primary]}
            progressBackgroundColor={t.surface}
          />
        ) : undefined
      }
    />
  );
}

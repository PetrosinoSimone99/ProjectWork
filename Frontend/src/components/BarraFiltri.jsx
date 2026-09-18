import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { Card } from './Card';
import { SelettoreCategoria } from './SelettoreCategoria';
import { SelettoreModalita } from './SelettoreModalita';
import { contaFiltri } from '@/servizi/offerta-ricerca';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * La barra dei filtri della home: testo, categoria, località e modalità a tre
 * scelte. Nessuno stato proprio: i filtri e le callback arrivano dall'hook
 * (`useCatalogoServizi`), così quello che c'è nella barra è anche quello che
 * produce la lista — una sola verità.
 *
 * Quando ogni controllo fa partire la richiesta:
 * - **testo e località** con Invio o con il pulsante «Filtra»: non si fa una
 *   richiesta per tasto premuto, altrimenti ogni lettera produrrebbe una
 *   richiesta e una raffica di risposte da scartare;
 * - **categoria e modalità** al tocco: sono scelte discrete e non hanno costo.
 *
 * Il pulsante di azzeramento compare **solo** quando qualcosa è attivo, e non
 * sparisce mai quando serve. La X nel campo di testo azzera **solo** il testo e
 * riapplica gli altri filtri: è diversa da «Azzera filtri», che svuota tutto.
 */
export function BarraFiltri({
  filtri,
  filtriApplicati,
  categorie,
  statoCategorie,
  erroreCategorie,
  onCambiaTesto,
  onCambiaScelta,
  onApplica,
  onAzzeraTesto,
  onAzzera,
  onRiprovaCategorie,
  filtrando = false,
  style,
}) {
  const t = useTokens();
  const numeroFiltri = contaFiltri(filtriApplicati);
  const categoriePronte = statoCategorie === 'pronto';
  const testoAttivo = filtri.testo.trim() !== '';

  return (
    <Card style={style}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: t.surface,
            borderColor: t.border,
            borderWidth: 1,
            borderRadius: radius.pill,
            paddingHorizontal: space.lg,
          }}
        >
          <Ionicons name="search-outline" size={16} color={t.textSecondary} />
          <TextInput
            style={{ flex: 1, minHeight: 50, fontSize: 15, color: t.text }}
            value={filtri.testo}
            onChangeText={(valore) => onCambiaTesto('testo', valore)}
            placeholder="es. ripetizioni, giardinaggio…"
            placeholderTextColor={t.textSecondary}
            onSubmitEditing={onApplica}
            returnKeyType="search"
            autoCapitalize="none"
            accessibilityLabel="Cerca nei servizi offerti"
          />
          {testoAttivo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancella il testo e riapplica i filtri"
              onPress={onAzzeraTesto}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={t.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <AppButton
          label="Filtra"
          icon="search"
          onPress={onApplica}
          loading={filtrando}
          accessibilityLabel="Applica i filtri"
        />
      </View>

      <SelettoreCategoria
        label="Categoria"
        categorie={categorie}
        value={filtri.idCategoria}
        stato={statoCategorie}
        onChange={(idCategoria) => onCambiaScelta('idCategoria', idCategoria)}
      />

      <AppInput
        label="Località"
        value={filtri.localita}
        onChangeText={(valore) => onCambiaTesto('localita', valore)}
        placeholder="es. Firenze"
        autoCapitalize="words"
        returnKeyType="search"
        onSubmitEditing={onApplica}
      />

      <SelettoreModalita
        value={filtri.modalita}
        onChange={(modalita) => onCambiaScelta('modalita', modalita)}
      />

      {/* Il catalogo **non** dipende dalle categorie: se non arrivano, il
          selettore è spento e lo dice, ma testo, località e modalità funzionano
          lo stesso. È la differenza rispetto alla registrazione, dove senza
          categorie non si salva niente. */}
      {categoriePronte ? null : (
        <View style={{ gap: space.sm }}>
          <AppText variant="small" tone="secondary">
            {messaggioCategorie(statoCategorie, erroreCategorie)}
          </AppText>
          {statoCategorie === 'caricamento' ? null : (
            <AppButton
              label="Riprova"
              variant="secondary"
              onPress={onRiprovaCategorie}
              style={{ alignSelf: 'flex-start' }}
            />
          )}
        </View>
      )}

      {numeroFiltri > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.sm,
            flexWrap: 'wrap',
          }}
        >
          <AppText variant="small" tone="secondary">
            {numeroFiltri === 1 ? '1 filtro attivo' : `${numeroFiltri} filtri attivi`}
          </AppText>
          <AppButton
            label="Azzera filtri"
            variant="ghost"
            icon="close-outline"
            onPress={onAzzera}
            accessibilityLabel="Azzera tutti i filtri"
          />
        </View>
      ) : null}
    </Card>
  );
}

/** Il messaggio delle categorie non disponibili, diverso da quello di registrazione. */
function messaggioCategorie(stato, dettaglio) {
  if (stato === 'caricamento') {
    return 'Sto caricando le categorie…';
  }
  if (stato === 'vuoto') {
    return 'Non ci sono categorie: puoi filtrare per testo, località e modalità.';
  }
  return `Non riesco a caricare le categorie: puoi filtrare per testo, località e modalità.${
    dettaglio ? ` ${dettaglio}` : ''
  }`;
}

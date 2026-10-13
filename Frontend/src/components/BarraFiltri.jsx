import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { SelettoreCategoria } from './SelettoreCategoria';
import { SelettoreElenco } from './SelettoreElenco';
import { contaFiltri } from '@/servizi/offerta-ricerca';
import { REGIONI, provincePerRegione } from '@/servizi/aree-italiane';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Sotto questa larghezza il campo di ricerca e «Filtra» vanno su due righe:
 * affiancati su 390px il placeholder veniva tagliato dal pulsante (P62).
 */
const SOGLIA_LAYOUT_STRETTO = 480;

/**
 * La barra dei filtri della home: testo, categoria e area (regione →
 * provincia). Nessuno stato proprio: i filtri e le callback arrivano dall'hook
 * (`useCatalogoServizi`), così quello che c'è nella barra è anche quello che
 * produce la lista — una sola verità. Il filtro **modalità non c'è più**: il
 * backend Symfony non ha un campo «da remoto» e una scelta senza supporto si
 * toglie, non si finta. Anche la **località a testo libero non c'è più**: era un
 * errore di sicurezza, ora sono due tendine dal dataset statico.
 *
 * Quando ogni controllo fa partire la richiesta:
 * - **testo** con Invio o con il pulsante «Filtra»: non si fa una richiesta per
 *   tasto premuto, altrimenti ogni lettera produrrebbe una richiesta e una
 *   raffica di risposte da scartare;
 * - **categoria, regione e provincia** al tocco: sono scelte discrete e non
 *   hanno costo. L'azzeramento di provincia al cambio regione lo fa l'hook.
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
  const layoutStretto = useWindowDimensions().width < SOGLIA_LAYOUT_STRETTO;

  return (
    <Card style={style}>
      <View
        style={{
          flexDirection: layoutStretto ? 'column' : 'row',
          gap: space.sm,
          alignItems: layoutStretto ? 'stretch' : 'center',
        }}
      >
        <View
          style={{
            flex: layoutStretto ? undefined : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: t.surface,
            borderColor: t.borderInput,
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

      <View
        style={{
          flexDirection: layoutStretto ? 'column' : 'row',
          gap: space.sm,
          alignItems: layoutStretto ? 'stretch' : 'flex-end',
        }}
      >
        <SelettoreElenco
          label="Regione"
          placeholder="Tutte le regioni"
          opzioni={REGIONI.map((r) => r.nome)}
          valore={filtri.regione}
          onChange={(valore) => onCambiaScelta('regione', valore)}
          style={{ flex: layoutStretto ? undefined : 1 }}
        />
        <SelettoreElenco
          label="Provincia"
          placeholder={filtri.regione === '' ? 'Scegli prima una regione' : 'Tutte le province'}
          opzioni={provincePerRegione(filtri.regione)}
          valore={filtri.provincia}
          disabled={filtri.regione === ''}
          onChange={(valore) => onCambiaScelta('provincia', valore)}
          style={{ flex: layoutStretto ? undefined : 1 }}
        />
      </View>
      <AppText variant="small" tone="secondary">
        Nessuna scelta: tutti i servizi. La regione allarga la ricerca, la provincia la restringe.
      </AppText>

      {/* Il catalogo **non** dipende dalle categorie: se non arrivano, il
          selettore è spento e lo dice, ma testo e area funzionano
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
    return 'Non ci sono categorie: puoi filtrare per testo e area.';
  }
  return `Non riesco a caricare le categorie: puoi filtrare per testo e area.${
    dettaglio ? ` ${dettaglio}` : ''
  }`;
}

import { useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card } from './Card';
import { CategorySelector } from './CategorySelector';
import { ListSelector } from './ListSelector';
import {
  contaFiltri,
  etichettaValoreModalita,
  SCELTE_FILTRO_MODALITA,
  valoreDaEtichettaModalita,
} from '@/services/offer-request';
import { REGIONI, provincePerRegione } from '@/services/italian-regions';
import { radius, space, target, useTokens } from '@/theme/tokens';

/**
 * Sotto questa larghezza il campo di ricerca e «Filtra» vanno su due righe:
 * affiancati su 390px il placeholder veniva tagliato dal pulsante (P62).
 */
const SOGLIA_LAYOUT_STRETTO = 480;

/**
 * La barra dei filtri della home: testo, categoria, area (regione →
 * provincia) e **modalità** (Tutti / solo da remoto / solo in presenza).
 * I filtri e le callback arrivano dall'hook (`useServiceCatalog`), così quello
 * che c'è nella barra è anche quello che produce la lista — una sola verità.
 * La modalità va al server come le altre scelte discrete (`isRemote=true|false`):
 * è il backend a decidere quali righe entrano in pagina. Anche la **località a
 * testo libero non c'è più**: era un errore di sicurezza, ora sono due tendine
 * dal dataset statico.
 *
 * Quando ogni controllo fa partire la richiesta:
 * - **testo** con Invio o con il pulsante «Filtra»: non si fa una richiesta per
 *   tasto premuto, altrimenti ogni lettera produrrebbe una richiesta e una
 *   raffica di risposte da scartare;
 * - **categoria, regione, provincia e modalità** al tocco: sono scelte discrete
 *   e non hanno costo. L'azzeramento di provincia al cambio regione lo fa
 *   l'hook.
 *
 * Il pulsante di azzeramento compare **solo** quando qualcosa è attivo, e non
 * sparisce mai quando serve. La X nel campo di testo azzera **solo** il testo e
 * riapplica gli altri filtri: è diversa da «Azzera filtri», che svuota tutto.
 *
 * Il pannello è **compresso di default** in una riga di riepilogo («Filtri ·
 * N attivi», audit UX F10): su 390×844 il pannello aperto occupava il primo
 * viewport intero e il primo risultato restava sotto la piega. Controlli e
 * nota stanno dentro il pannello espanso; il conteggio della riga parla dei
 * filtri **applicati**, cioè di quelli che hanno prodotto i risultati a
 * schermo. Il tasto di espansione è un bottone con `expanded` esplicito, e
 * l'unico conteggio della card è nel riepilogo.
 */
export function FilterBar({
  filtri,
  filtriApplicati,
  categorie,
  statoCategorie,
  erroreCategorie,
  onCambiaTesto,
  onCambiaScelta,
  onCambiaModalita,
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
  const [pannelloAperto, setPannelloAperto] = useState(false);

  // Sotto la soglia le righe si impilano e i campi diventano larghi quanto il
  // contenitore: valori calcolati una volta sola per tutte le righe.
  const direzioneRiga = layoutStretto ? 'column' : 'row';
  const flessibile = layoutStretto ? undefined : 1;

  return (
    <Card style={style}>
      {/* Riga di riepilogo sempre visibile: quanti filtri sono applicati e
          apertura/chiusura del pannello (F10). */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: pannelloAperto }}
        aria-expanded={pannelloAperto}
        onPress={() => setPannelloAperto((aperto) => !aperto)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.sm,
          minHeight: target.min,
        }}
      >
        <AppText variant="body" style={{ fontWeight: '700' }}>
          {numeroFiltri === 1 ? 'Filtri · 1 attivo' : `Filtri · ${numeroFiltri} attivi`}
        </AppText>
        <AppIcon
          name={pannelloAperto ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={t.textSecondary}
        />
      </Pressable>

      {pannelloAperto ? (
        <>
          <View
            style={{
              flexDirection: direzioneRiga,
              gap: space.sm,
              alignItems: layoutStretto ? 'stretch' : 'center',
            }}
          >
            <View
              style={{
                flex: flessibile,
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
              <AppIcon name="search-outline" size={16} color={t.textSecondary} />
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
                // La X azzera **solo** il testo e riapplica gli altri filtri:
                // è il contrario di «Azzera filtri» (F05).
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancella il testo e riapplica i filtri"
                  onPress={onAzzeraTesto}
                  // 44 pt: l'icona da 18 con `hitSlop` arrivava a 34 (audit UX F17).
                  style={{
                    minWidth: target.min,
                    minHeight: target.min,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon name="close-circle" size={18} color={t.textSecondary} />
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

          <CategorySelector
            label="Categoria"
            categorie={categorie}
            value={filtri.idCategoria}
            stato={statoCategorie}
            etichettaAzzera="Tutte le categorie"
            onChange={(idCategoria) => onCambiaScelta('idCategoria', idCategoria)}
          />

          <View
            style={{
              flexDirection: direzioneRiga,
              gap: space.sm,
              alignItems: layoutStretto ? 'stretch' : 'flex-end',
            }}
          >
            <ListSelector
              label="Regione"
              placeholder="Tutte le regioni"
              opzioni={REGIONI.map((r) => r.nome)}
              valore={filtri.regione}
              etichettaAzzera="Tutte le regioni"
              onChange={(valore) => onCambiaScelta('regione', valore)}
              style={{ flex: flessibile }}
            />
            <ListSelector
              label="Provincia"
              placeholder={filtri.regione === '' ? 'Scegli prima una regione' : 'Tutte le province'}
              opzioni={provincePerRegione(filtri.regione)}
              valore={filtri.provincia}
              etichettaAzzera="Tutte le province"
              disabled={filtri.regione === ''}
              onChange={(valore) => onCambiaScelta('provincia', valore)}
              style={{ flex: flessibile }}
            />
            <ListSelector
              label="Modalità"
              placeholder="Tutti"
              opzioni={SCELTE_FILTRO_MODALITA.map((scelta) => scelta.etichetta)}
              valore={etichettaValoreModalita(filtri.modalita)}
              onChange={(etichetta) => onCambiaModalita(valoreDaEtichettaModalita(etichetta))}
              style={{ flex: flessibile }}
            />
          </View>

          {/* La nota spiega le etichette sopra: sta **dentro** il pannello,
              non fuori dalla card (F10). */}
          <AppText variant="small" tone="secondary">
            Nessuna scelta: tutti i servizi. Regione e provincia restringono la
            località, la modalità l'ambito («Tutti» non restringe).
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
            <AppButton
              label="Azzera filtri"
              variant="ghost"
              icon="close-outline"
              onPress={onAzzera}
              accessibilityLabel="Azzera tutti i filtri"
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
        </>
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

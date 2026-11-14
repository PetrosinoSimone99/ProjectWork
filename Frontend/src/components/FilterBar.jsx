import { useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card } from './Card';
import { CategorySelector } from './CategorySelector';
import { ListSelector } from './ListSelector';
import { ToneChip } from './ToneChip';
import {
  contaFiltri,
  etichettaValoreModalita,
  SCELTE_FILTRO_MODALITA,
  valoreDaEtichettaModalita,
} from '@/services/offer-request';
import { REGIONI, provincePerRegione } from '@/services/italian-regions';
import { opacity, radius, space, target, useTokens } from '@/theme/tokens';

/**
 * Sotto questa larghezza le righe della barra si impilano: su 390px la riga di
 * ricerca e la riga delle tendine stanno su righe separate, con i campi larghi
 * quanto il contenitore (P62).
 */
const SOGLIA_LAYOUT_STRETTO = 480;

/**
 * La barra dei filtri della home: testo, categoria, area (regione →
 * provincia) e **modalità** (Tutti / solo da remoto / solo in presenza).
 * I filtri e le callback arrivano dall'hook (`useServiceCatalog`), così quello
 * che c'è nella barra è anche quello che produce la lista — una sola verità.
 * Eccezione: la bozza del testo vive qui (`bozzaTesto`), così ogni tasto
 * ri-renderizza solo la barra e non il catalogo (F74).
 * La modalità va al server come le altre scelte discrete (`isRemote=true|false`):
 * è il backend a decidere quali righe entrano in pagina. Anche la **località a
 * testo libero non c'è più**: era un errore di sicurezza, ora sono due tendine
 * dal dataset statico.
 *
 * Quando ogni controllo fa partire la richiesta:
 * - **testo** con Invio o con «Cerca», il controllo dentro il campo stesso che
 *   governa: non si fa una richiesta per tasto premuto, altrimenti ogni lettera
 *   produrrebbe una richiesta e una raffica di risposte da scartare. Finché il
 *   testo digitato differisce da quello applicato, un chip di attesa nel posto
 *   sempre visibile dice che la ricerca non è ancora partita;
 * - **categoria, regione, provincia e modalità** al tocco: sono scelte discrete
 *   e non hanno costo. L'azzeramento di provincia al cambio regione lo fa
 *   l'hook.
 *
 * Il piede è **sempre visibile**, fuori dal pannello: con i filtri attivi dice
 * «N filtri attivi · Azzera» e l'unico «Azzera» della card svuota tutto; senza
 * filtri dice «Nessun filtro attivo». La X nel campo di testo azzera **solo**
 * il testo e riapplica gli altri filtri: è diversa da «Azzera», che svuota
 * tutto.
 *
 * Il pannello è **compresso di default** in una riga di riepilogo («Filtri» con
 * la freccia, audit UX F10): su 390×844 il pannello aperto occupava il primo
 * viewport intero e il primo risultato restava sotto la piega. Controlli e
 * nota stanno dentro il pannello espanso; il conteggio sta solo nel piede,
 * parla dei filtri **applicati**, cioè di quelli che hanno prodotto i risultati
 * a schermo, e digitare non lo muove. Il tasto di espansione è un bottone con
 * `expanded` esplicito.
 */
export function FilterBar({
  filtri,
  filtriApplicati,
  categorie,
  statoCategorie,
  erroreCategorie,
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
  const layoutStretto = useWindowDimensions().width < SOGLIA_LAYOUT_STRETTO;
  const [pannelloAperto, setPannelloAperto] = useState(false);
  // La bozza del testo sta qui: ogni tasto ri-renderizza solo la barra,
  // non l'intero catalogo (F74).
  const [bozzaTesto, setBozzaTesto] = useState('');
  const testoAttivo = bozzaTesto.trim() !== '';

  // Invio e «Cerca» applicano la bozza: al padre arriva il testo, non un campo.
  // Con il layout stretto l'applicazione chiude anche il pannello: su 390 px
  // confermare torna subito ai risultati; sopra la soglia resta aperto (F10).
  const applicaBozza = () => {
    onApplica(bozzaTesto);
    if (layoutStretto) {
      setPannelloAperto(false);
    }
  };
  // La X svuota la bozza qui e chiede al padre di riapplicare senza il testo.
  const svuotaBozza = () => {
    setBozzaTesto('');
    onAzzeraTesto();
  };
  // «Azzera filtri» del piede: la bozza si svuota insieme a tutto, poi tocca al padre.
  const azzeraTutto = () => {
    setBozzaTesto('');
    onAzzera();
  };

  // La bozza segue il testo **applicato** quando questo torna vuoto da fuori:
  // ogni reset della home passa dalla barra e svuota prima la bozza, ma se il
  // testo applicato cambia senza passare da qui il campo resterebbe con una
  // ricerca che non è più in corso e il chip la annuncerebbe come in attesa.
  // È l'aggiustamento di stato in render documentato da React, non un effetto:
  // digitare non lo attraversa (il testo applicato non cambia) e una scelta
  // discreta non lo tocca per la stessa ragione.
  const [testoApplicatoPrecedente, setTestoApplicatoPrecedente] = useState(
    filtriApplicati.testo,
  );
  if (filtriApplicati.testo !== testoApplicatoPrecedente) {
    setTestoApplicatoPrecedente(filtriApplicati.testo);
    if (filtriApplicati.testo === '') {
      setBozzaTesto('');
    }
  }

  // Sotto la soglia le righe si impilano e i campi diventano larghi quanto il
  // contenitore: valori calcolati una volta sola per tutte le righe.
  const direzioneRiga = layoutStretto ? 'column' : 'row';
  const flessibile = layoutStretto ? undefined : 1;

  return (
    <Card style={style}>
      {/* Riga di riepilogo sempre visibile: «Filtri» e apertura/chiusura del
          pannello, con lo stato dei filtri sulla stessa riga quando non ce ne
          sono. Prima lo stato viveva in un piede tutto suo: due righe da 44 pt
          in una card che ne dichiarava l'assenza, cioè 108 pt di viewport per
          dire «niente» (critica, P2: il primo servizio cominciava a metà
          schermata). Il conteggio dei filtri **applicati** resta nel piede,
          accanto ad «Azzera», quando c'è qualcosa da contare (F10). */}
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
          Filtri
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {numeroFiltri === 0 ? (
            <AppText variant="small" tone="secondary">
              Nessun filtro attivo
            </AppText>
          ) : null}
          <AppIcon
            name={pannelloAperto ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={t.textSecondary}
          />
        </View>
      </Pressable>

      {/* Il testo digitato ma non applicato sta **fuori** dal pannello: è
          visibile anche a pannello chiuso e dice che la ricerca non è partita;
          il conteggio del piede conta i filtri applicati e non si muove (F45). */}
      {testoAttivo && bozzaTesto.trim() !== filtriApplicati.testo.trim() ? (
        <ToneChip tono="accent">{`Cerca «${bozzaTesto.trim()}»`}</ToneChip>
      ) : null}

      {pannelloAperto ? (
        <>
          <View
            style={{
              flexDirection: direzioneRiga,
              gap: space.sm,
              alignItems: layoutStretto ? 'stretch' : 'center',
            }}
          >
            <SearchField
              testo={bozzaTesto}
              testoAttivo={testoAttivo}
              flexibile={flessibile}
              filtrando={filtrando}
              onCambiaBozza={setBozzaTesto}
              onApplica={applicaBozza}
              onAzzeraTesto={svuotaBozza}
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
        </>
      ) : null}

      {/* Il piede esiste solo quando c'è qualcosa da contare: senza filtri
          l'unica informazione è «Nessun filtro attivo», che sta già nella riga
          di riepilogo. */}
      {numeroFiltri > 0 ? (
        <FilterFooter numeroFiltri={numeroFiltri} onAzzera={azzeraTutto} />
      ) : null}
    </Card>
  );
}

/**
 * La pillola del campo di testo: ricerca, la X (azzera **solo** il testo) e
 * «Cerca» (applica) stanno tutti dentro la stessa pillola, così il controllo
 * che parte è nel campo che governa (F84) e, mentre `filtrando` è vero, è
 * disabilitato davvero invece di fingere uno stato.
 */
function SearchField({
  testo,
  testoAttivo,
  flexibile,
  filtrando,
  onCambiaBozza,
  onApplica,
  onAzzeraTesto,
}) {
  const t = useTokens();
  return (
    <View
      style={{
        flex: flexibile,
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
        value={testo}
        onChangeText={onCambiaBozza}
        placeholder="es. ripetizioni, giardinaggio…"
        placeholderTextColor={t.textSecondary}
        onSubmitEditing={onApplica}
        returnKeyType="search"
        autoCapitalize="none"
        accessibilityLabel="Cerca nei servizi offerti"
      />
      {testoAttivo ? (
        // La X azzera **solo** il testo e riapplica gli altri filtri:
        // è il contrario di «Azzera», che dal piede svuota tutto (F05).
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
      {/* «Cerca» sta dentro il campo che governa, accanto alla X: fa partire la
          richiesta come il vecchio pulsante esterno e, finché `filtrando` è
          vero, è davvero disabilitato invece di fingere uno stato (F84). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Applica la ricerca"
        accessibilityState={{ disabled: filtrando }}
        aria-disabled={filtrando}
        disabled={filtrando}
        onPress={onApplica}
        // Stile statico come la X accanto: l'unica variabile è `filtrando`,
        // che attenua il controllo disabilitato (0.7, come AppButton).
        style={{
          minWidth: target.min,
          minHeight: target.min,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: filtrando ? opacity.disabled : 1,
        }}
      >
        <AppText variant="label" tone="primary">
          Cerca
        </AppText>
      </Pressable>
    </View>
  );
}

/**
 * Il piede, **sempre visibile**, fuori dal pannello (risposta 2 del lock): qui
 * sta l'unico conteggio della card e l'unico «Azzera», e il conteggio parla dei
 * filtri applicati: digitare non lo muove.
 */
function FilterFooter({ numeroFiltri, onAzzera }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: space.sm,
        minHeight: target.min,
      }}
    >
      <AppText variant="small" tone="secondary">
        {etichettaPiede(numeroFiltri)}
      </AppText>
      {numeroFiltri > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Azzera tutti i filtri"
          onPress={onAzzera}
          style={({ pressed }) => ({
            minWidth: target.min,
            minHeight: target.min,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <AppText tone="primary" style={{ fontWeight: '600' }}>
            Azzera
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** La riga del piede: i filtri **applicati** soltanto; il «·» annuncia l'«Azzera» accanto. */
function etichettaPiede(quanti) {
  if (quanti === 1) {
    return '1 filtro attivo ·';
  }
  return `${quanti} filtri attivi ·`;
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

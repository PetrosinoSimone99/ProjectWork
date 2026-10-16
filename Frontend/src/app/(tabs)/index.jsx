import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { BarraFiltri } from '@/components/BarraFiltri';
import { EmptyState } from '@/components/EmptyState';
import { ModalDettaglioServizio } from '@/components/ModalDettaglioServizio';
import { SezioneServizi } from '@/components/SezioneServizi';
import { Screen } from '@/components/Screen';
import { useCategorie } from '@/hooks/useCategorie';
import { useCatalogoServizi } from '@/hooks/useCatalogoServizi';
import {
  contaFiltri,
  descriviFiltri,
  rigaFiltroModalita,
  VALORI_MODALITA,
} from '@/servizi/offerta-ricerca';
import { space, useTokens } from '@/theme/tokens';

/**
 * Home dei servizi: il catalogo delle offerte pubblicate e attive **degli
 * altri** (`GET /api/services`), con i filtri in cima (testo, categoria, area —
 * regione o provincia — e modalità) e «Carica altri» in fondo alla lista.
 *
 * Il filtro **modalità** è l'unico client-side: il backend non accetta un
 * parametro per la modalità (segnalazione 31), quindi si filtrano le righe già
 * caricate e la riga sopra la lista lo dice, con la via d'uscita onesta («Carica
 * altri» se c'è, altrimenti azzera).
 *
 * Tutta la logica di rete e dei filtri sta in `useCatalogoServizi`; qui restano
 * il disegno, gli stati e il dettaglio. Le voci proprie non entrano nel catalogo
 * (la normalizzazione le scarta): si vedono e si gestiscono in «Offro e cerco».
 *
 * Gli stati sono espliciti e distinti: caricamento, errore con «Riprova», vuoto
 * **senza** filtri («Nessun servizio attivo») e vuoto **con** filtri («Nessun
 * risultato per questi filtri»), che sono due messaggi diversi, più il
 * caricamento e l'errore riprovabile di «Carica altri».
 *
 * Qui non c'è il banner dei dati finti: la home parla **solo** col backend vero
 * (decisione del titolare, 30 settembre 2026) e con `EXPO_PUBLIC_DATI_FINTI=1`
 * mostra il suo stato di errore, non un catalogo inventato.
 */
export default function HomeScreen() {
  const { token, utente } = useAuth();
  const t = useTokens();
  const [dettaglio, setDettaglio] = useState(null);

  const {
    categorie,
    stato: statoCategorie,
    errore: erroreCategorie,
    ricarica: ricaricaCategorie,
  } = useCategorie(token);

  const {
    servizi,
    caricamento,
    errore,
    paginazione,
    caricamentoAltri,
    erroreAltri,
    filtri,
    filtriApplicati,
    cambiaTesto,
    cambiaScelta,
    cambiaModalita,
    applicaFiltri,
    azzeraTesto,
    azzeraFiltri,
    riprova,
    caricaAltri,
    refreshing,
    onRefresh,
    nascondeModalita,
  } = useCatalogoServizi({ token, utenteId: utente?.id });

  const numeroFiltri = contaFiltri(filtriApplicati);
  const haFiltri = numeroFiltri > 0;
  const soloTesto = numeroFiltri === 1 && filtriApplicati.testo.trim() !== '';

  // Stato del filtro client-side della modalità: attivo, da solo, e il nome
  // della modalità in italiano per i messaggi di vuoto.
  const modalitaAttiva = filtriApplicati.modalita !== VALORI_MODALITA.TUTTE;
  const soloModalita = numeroFiltri === 1 && modalitaAttiva;
  const nomeModalita =
    filtriApplicati.modalita === VALORI_MODALITA.REMOTO ? 'da remoto' : 'in presenza';
  const testoModalita = rigaFiltroModalita(filtriApplicati.modalita);

  // «Carica altri» compare solo quando il backend dice che un'altra pagina c'è:
  // con 0 o 1 pagina il pulsante non esiste, e non si inventano numeri.
  const ciSonoAltri =
    paginazione !== null &&
    paginazione.pagina !== null &&
    paginazione.pagineTotali !== null &&
    paginazione.pagina < paginazione.pagineTotali;

  // Gli stati del catalogo, in ordine di precedenza. Lo spinner a schermo pieno
  // compare **solo** quando non c'è ancora nulla: i ricarichi e i cambi di filtro
  // tengono visibile l'ultimo contenuto.
  let contenuto = null;
  if (caricamento && servizi === null) {
    contenuto = (
      <View style={{ alignItems: 'center', paddingVertical: space.xxl, gap: space.md }}>
        <ActivityIndicator size="large" color={t.primary} />
        <AppText variant="small" tone="secondary">
          Carico i servizi…
        </AppText>
      </View>
    );
  } else if (servizi !== null && servizi.length === 0 && !errore) {
    // Con un errore a schermo lo stato vuoto sarebbe fuorviante: c'è il Banner.
    // Vuoto causato dal filtro client-side della modalità da solo: il messaggio
    // dice la via d'uscita vera — «Carica altri» quando il backend ne ha, dato
    // che il filtro vede solo ciò che è già caricato.
    contenuto = haFiltri ? (
      nascondeModalita && soloModalita ? (
        <EmptyState
          icon="search-outline"
          title={`Nessun servizio ${nomeModalita} tra quelli caricati`}
          description={
            ciSonoAltri
              ? 'Il catalogo ha altre pagine: caricarne altre può portarne qualcuna.'
              : 'Tra le righe già caricate nessuna corrisponde: prova a togliere il filtro.'
          }
          etichettaAzione={ciSonoAltri ? 'Carica altri' : 'Azzera filtri'}
          onAzione={ciSonoAltri ? () => void caricaAltri() : azzeraFiltri}
        />
      ) : (
        <EmptyState
          icon="search-outline"
          title={
            soloTesto
              ? `Nessun risultato per “${filtriApplicati.testo.trim()}”`
              : 'Nessun risultato per questi filtri'
          }
          description={`Prova a toglierne uno: ${descriviFiltri(filtriApplicati, categorie)}.`}
          etichettaAzione="Azzera filtri"
          onAzione={azzeraFiltri}
        />
      )
    ) : (
      <EmptyState
        variante="mercato"
        icon="pricetags-outline"
        title="Nessun servizio attivo"
        description="Quando qualcuno pubblica un servizio, lo troverai qui: per ora nessuno ne ha pubblicati."
        etichettaAzione="Ricarica"
        onAzione={() => void riprova()}
      />
    );
  } else if (servizi !== null && servizi.length > 0) {
    // Una sola sezione e una sola lista: le pagine di «Carica altri» si
    // aggiungono allo stesso elenco, e il pulsante sta sotto la sezione.
    contenuto = (
      <>
        {/* Riga onesta del filtro client-side: solo quando il filtro
            modalità è attivo c'è davvero una parte di catalogo non visibile. */}
        {testoModalita ? (
          <AppText variant="small" tone="secondary">
            {testoModalita}
          </AppText>
        ) : null}
        <SezioneServizi titolo="Servizi" voci={servizi} onSelect={setDettaglio} />
        {ciSonoAltri ? (
          <View style={{ alignItems: 'center', gap: space.sm }}>
            {erroreAltri ? <Banner kind="error" message={erroreAltri} /> : null}
            <AppButton
              label={
                caricamentoAltri ? 'Carico altri…' : erroreAltri ? 'Riprova' : 'Carica altri'
              }
              variant="secondary"
              icon={erroreAltri && !caricamentoAltri ? 'refresh-outline' : undefined}
              disabled={caricamentoAltri || caricamento}
              onPress={erroreAltri ? riprova : caricaAltri}
              style={{ alignSelf: 'center' }}
            />
          </View>
        ) : null}
      </>
    );
  }

  return (
    // L'unica schermata larga: le card del catalogo guadagnano spazio su
    // desktop, tutte le altre restano su `layout.maxContent`.
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh} larga>
      <ModalDettaglioServizio servizio={dettaglio} onChiudi={() => setDettaglio(null)} />

      <View style={{ gap: space.xs }}>
        <AppText variant="title">Servizi</AppText>
        <AppText variant="small" tone="secondary">
          I servizi pubblicati dagli altri: filtra per testo, categoria, area e
          modalità.
        </AppText>
      </View>

      <BarraFiltri
        filtri={filtri}
        filtriApplicati={filtriApplicati}
        categorie={categorie}
        statoCategorie={statoCategorie}
        erroreCategorie={erroreCategorie}
        onCambiaTesto={cambiaTesto}
        onCambiaScelta={cambiaScelta}
        onCambiaModalita={cambiaModalita}
        onApplica={applicaFiltri}
        onAzzeraTesto={azzeraTesto}
        onAzzera={azzeraFiltri}
        onRiprovaCategorie={ricaricaCategorie}
        filtrando={caricamento}
      />

      {errore ? (
        <>
          <Banner kind="error" message={errore} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={riprova}
            style={{ alignSelf: 'flex-start' }}
          />
        </>
      ) : null}

      {contenuto}
    </Screen>
  );
}

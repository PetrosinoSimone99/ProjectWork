import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
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
import { contaFiltri, descriviFiltri } from '@/servizi/offerta-ricerca';
import { space, useTokens } from '@/theme/tokens';

/**
 * Home dei servizi: il catalogo delle offerte pubblicate e attive **degli
 * altri**, con i filtri in cima (testo, categoria, località, modalità).
 *
 * Tutta la logica di rete e dei filtri sta in `useCatalogoServizi`; qui restano
 * il disegno, gli stati e il dettaglio. Le voci proprie non entrano nel catalogo
 * (la normalizzazione le scarta): si vedono e si gestiscono in «Offro e cerco».
 *
 * Gli stati sono espliciti e distinti: caricamento, errore con «Riprova», vuoto
 * **senza** filtri («Nessun servizio attivo») e vuoto **con** filtri («Nessun
 * risultato per questi filtri»), che sono due messaggi diversi.
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
    filtri,
    filtriApplicati,
    cambiaTesto,
    cambiaScelta,
    applicaFiltri,
    azzeraTesto,
    azzeraFiltri,
    riprova,
    refreshing,
    onRefresh,
  } = useCatalogoServizi({ token, utenteId: utente?.id });

  const numeroFiltri = contaFiltri(filtriApplicati);
  const haFiltri = numeroFiltri > 0;
  const soloTesto = numeroFiltri === 1 && filtriApplicati.testo.trim() !== '';

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
    contenuto = haFiltri ? (
      <>
        <EmptyState
          icon="search-outline"
          title={
            soloTesto
              ? `Nessun risultato per “${filtriApplicati.testo.trim()}”`
              : 'Nessun risultato per questi filtri'
          }
          description={`Prova a toglierne uno: ${descriviFiltri(filtriApplicati, categorie)}.`}
        />
        <AppButton
          label="Azzera filtri"
          variant="secondary"
          onPress={azzeraFiltri}
          style={{ alignSelf: 'center' }}
        />
      </>
    ) : (
      <EmptyState
        icon="pricetags-outline"
        title="Nessun servizio attivo"
        description="Quando qualcuno pubblica un servizio, lo troverai qui: per ora nessuno ne ha pubblicati."
      />
    );
  } else if (servizi !== null && servizi.length > 0) {
    contenuto = (
      <SezioneServizi
        titolo="Servizi"
        voci={servizi}
        categorie={categorie}
        onSelect={setDettaglio}
      />
    );
  }

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <ModalDettaglioServizio
        servizio={dettaglio}
        categorie={categorie}
        onChiudi={() => setDettaglio(null)}
      />

      <View style={{ gap: space.xs }}>
        <AppText variant="title">Servizi</AppText>
        <AppText variant="small" tone="secondary">
          I servizi pubblicati dagli altri: filtra per testo, categoria, località e modalità.
        </AppText>
      </View>

      {USA_DATI_FINTI ? (
        <Banner kind="info" message={AVVISO_DEMO} />
      ) : null}

      <BarraFiltri
        filtri={filtri}
        filtriApplicati={filtriApplicati}
        categorie={categorie}
        statoCategorie={statoCategorie}
        erroreCategorie={erroreCategorie}
        onCambiaTesto={cambiaTesto}
        onCambiaScelta={cambiaScelta}
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

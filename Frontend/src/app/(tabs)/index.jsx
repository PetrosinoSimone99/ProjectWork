import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { ApiError, sendExchangeProposal } from '@/api';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { FilterBar } from '@/components/FilterBar';
import { EmptyState } from '@/components/EmptyState';
import { ServiceDetailModal } from '@/components/ServiceDetailModal';
import { ServicesSection } from '@/components/ServicesSection';
import { Screen } from '@/components/Screen';
import { useCategories } from '@/hooks/useCategories';
import { useServiceCatalog } from '@/hooks/useServiceCatalog';
import {
  contaFiltri,
  descriviFiltri,
} from '@/services/offer-request';
import { space, useTokens } from '@/theme/tokens';

/**
 * Frase onesta dello stato vuoto quando il filtro area è attivo (decisione del
 * titolare, 16/10/2026): dal 16/10/2026 il backend cerca la località del
 * servizio, e le voci pubblicate prima non ce l'hanno.
 */
const NOTA_FILTRO_AREA =
  "Le ricerche per area trovano solo i servizi che hanno una località salvata: quelli pubblicati prima non ce l'hanno.";

/**
 * Home dei servizi: il catalogo delle offerte pubblicate e attive **degli
 * altri** (`GET /api/services`), con i filtri in cima (testo, categoria, area —
 * regione o provincia — e modalità) e «Carica altri» in fondo alla lista.
 *
 * Testo, categoria, area e modalità sono tutti richieste al server: il backend
 * ordina il catalogo per rilevanza (le categorie delle mie richieste prima)
 * prima di paginare e filtra con `isRemote=true|false`, quindi qui non c'è
 * nessun filtro client-side e nessun riordinamento locale.
 *
 * Tutta la logica di rete e dei filtri sta in `useServiceCatalog`; qui restano
 * il disegno, gli stati e il dettaglio. Le voci proprie non entrano nel catalogo
 * (la normalizzazione le scarta): si vedono e si gestiscono in «Offro e cerco».
 *
 * Gli stati sono espliciti e distinti: caricamento, errore con «Riprova», vuoto
 * **senza** filtri («Nessun servizio attivo») e vuoto **con** filtri («Nessun
 * risultato per questi filtri»), che sono due messaggi diversi, più il
 * caricamento e l'errore riprovabile di «Carica altri».
 *
 * La home parla **solo** col backend vero (decisione del titolare, 30 settembre
 * 2026): la modalitá a dati finti è stata rimossa (D011), quindi qui non esiste
 * nessuna scorciatoia che possa mostrare un catalogo inventato.
 */
export default function HomeScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const [dettaglio, setDettaglio] = useState(null);

  // The last successful proposal: the popup closed and the banner says where
  // the proposal went. Opening another service (or sending another one)
  // resets it, so the line never lingers as if it were about the open panel.
  const [propostaInviataA, setPropostaInviataA] = useState(null);

  /**
   * The send action of the detail panel (brief, decision 3):
   * `POST /create-exchange-agreement` takes the **person** (`offerente.id`),
   * never a service — the agreement is born with that person and the service
   * is named later in the sheet. Duplicates with the same person are possible
   * while the backend takes only a user id (G4): documented, not masked.
   * The panel owns the in-flight and error states; this function only calls.
   */
  async function inviaProposta(servizio) {
    const autore = servizio?.offerente ?? {};
    if (!Number.isInteger(autore.id)) {
      // ApiError so the panel shows this line instead of its generic fallback.
      throw new ApiError(0, 'Non trovo questa persona: ricarica il catalogo e riprova.');
    }
    await sendExchangeProposal(token, autore.id);
  }

  /**
   * On success: close the panel only if it still shows the service that was
   * proposed to (the user may have opened another one while the call flew),
   * then say where the proposal went.
   */
  function propostaInviata(servizioInviato, username) {
    setDettaglio((corrente) => (corrente === servizioInviato ? null : corrente));
    setPropostaInviataA(username ?? '');
  }

  /**
   * The report action of the detail panel: the route needs the reported user's
   * id (the author always comes from the JWT) and, for the copy, the name the
   * panel already shows. The catalog never contains the viewer's own rows, so
   * the self-report case cannot be reached from here.
   */
  function apriSegnalazione(servizio) {
    const autore = servizio?.offerente ?? {};
    if (!Number.isInteger(autore.id)) {
      return;
    }
    setDettaglio(null);
    router.push({
      pathname: '/report',
      params: {
        reportedUserId: String(autore.id),
        username: autore.username ?? '',
        nome: autore.nome ?? '',
        cognome: autore.cognome ?? '',
      },
    });
  }

  const {
    categorie,
    stato: statoCategorie,
    errore: erroreCategorie,
    ricarica: ricaricaCategorie,
  } = useCategories(token);

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
  } = useServiceCatalog({ token, utenteId: utente?.id });

  const numeroFiltri = contaFiltri(filtriApplicati);
  const haFiltri = numeroFiltri > 0;
  const soloTesto = numeroFiltri === 1 && filtriApplicati.testo.trim() !== '';

  // Il filtro area (regione e/o provincia) è attivo: solo allora il vuoto può
  // essere «ingiusto», perché le voci vecchie non hanno la località e non
  // comparirebbero mai. Con filtri misti la frase compare lo stesso.
  const filtroAreaAttivo =
    (typeof filtriApplicati.regione === 'string' && filtriApplicati.regione.trim() !== '') ||
    (typeof filtriApplicati.provincia === 'string' && filtriApplicati.provincia.trim() !== '');
  const descrizioneVuotoFiltri =
    `Prova a toglierne uno: ${descriviFiltri(filtriApplicati, categorie)}.` +
    (filtroAreaAttivo ? ` ${NOTA_FILTRO_AREA}` : '');

  // «Carica altri» compare solo quando il backend dice che un'altra pagina c'è:
  // con 0 o 1 pagina il pulsante non esiste, e non si inventano numeri.
  const ciSonoAltri =
    paginazione !== null &&
    paginazione.pagina !== null &&
    paginazione.pagineTotali !== null &&
    paginazione.pagina < paginazione.pagineTotali;

  // Gli stati della lista vuota, in ordine di precedenza. Lo spinner a
  // schermo pieno compare **solo** quando non c'è ancora nulla: i ricarichi e
  // i cambi di filtro tengono visibile l'ultimo contenuto. Con un errore a
  // schermo lo stato vuoto sarebbe fuorviante: c'è il Banner in testata.
  let listaVuota = null;
  if (caricamento && servizi === null) {
    listaVuota = (
      <View style={{ alignItems: 'center', paddingVertical: space.xxl, gap: space.md }}>
        <ActivityIndicator size="large" color={t.primary} />
        <AppText variant="small" tone="secondary">
          Carico i servizi…
        </AppText>
      </View>
    );
  } else if (servizi !== null && servizi.length === 0 && !errore) {
    listaVuota = haFiltri ? (
      <EmptyState
        icon="search-outline"
        title={
          soloTesto
            ? `Nessun risultato per “${filtriApplicati.testo.trim()}”`
            : 'Nessun risultato per questi filtri'
        }
        description={descrizioneVuotoFiltri}
        etichettaAzione="Azzera filtri"
        onAzione={azzeraFiltri}
      />
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
  }

  // Coda della lista: «Carica altri» e il suo errore. Compare solo quando il
  // backend dice che un'altra pagina c'è: con 0 o 1 pagina il pulsante non
  // esiste, e non si inventano numeri.
  const codaLista = ciSonoAltri ? (
    <View style={{ alignItems: 'center', gap: space.sm }}>
      {erroreAltri ? <Banner kind="error" message={erroreAltri} /> : null}
      <AppButton
        label={caricamentoAltri ? 'Carico altri…' : erroreAltri ? 'Riprova' : 'Carica altri'}
        variant="secondary"
        icon={erroreAltri && !caricamentoAltri ? 'refresh-outline' : undefined}
        disabled={caricamentoAltri || caricamento}
        onPress={erroreAltri ? riprova : caricaAltri}
        style={{ alignSelf: 'center' }}
      />
    </View>
  ) : null;

  // Testata della lista (`ListHeaderComponent`): titolo, esito della proposta,
  // filtri ed errore del catalogo. Scorre insieme ai risultati; il conteggio
  // dei risultati lo disegna `ServicesSection` sotto questa testata.
  const testata = (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Servizi</AppText>
        <AppText variant="small" tone="secondary">
          I servizi pubblicati dagli altri: filtra per testo, categoria, area e
          modalità.
        </AppText>
      </View>

      {propostaInviataA !== null ? (
        <Banner
          kind="success"
          message={
            propostaInviataA
              ? `Proposta inviata a @${propostaInviataA}. La trovi in Accordi.`
              : 'Proposta inviata. La trovi in Accordi.'
          }
          // Un messaggio di successo che resta fino alla prossima scrittura non è
          // più una notizia: si chiude come gli altri (audit F46).
          etichettaAzione="Ho capito"
          iconaAzione="checkmark-outline"
          onAzione={() => setPropostaInviataA(null)}
        />
      ) : null}

      <FilterBar
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
        // Il ritentativo vive dentro il messaggio che ha fallito: separato, a
        // 16 px di distanza, si legge come un comando che non c'entra (F87).
        <Banner
          kind="error"
          message={errore}
          etichettaAzione="Riprova"
          iconaAzione="refresh-outline"
          onAzione={riprova}
        />
      ) : null}
    </View>
  );

  return (
    // L'unica schermata larga: le card del catalogo guadagnano spazio su
    // desktop, tutte le altre restano su `layout.maxContent`. La lista è la
    // pagina: `Screen` non scrolla (F42) e il pull-to-refresh sta sulla
    // `FlatList` di `ServicesSection`.
    <Screen scroll={false} withBottomInset={false} larga>
      <ServiceDetailModal
        servizio={dettaglio}
        onClose={() => setDettaglio(null)}
        onReport={apriSegnalazione}
        onSendProposal={inviaProposta}
        onProposalSent={propostaInviata}
      />

      <ServicesSection
        titolo="Servizi"
        paginazione={paginazione}
        voci={servizi ?? []}
        testata={testata}
        vuoto={listaVuota}
        coda={codaLista}
        refreshing={refreshing}
        onRefresh={() => {
          // An explicit pull-to-refresh retires the confirmation: a banner left
          // over from hours ago would read as a proposal sent just now.
          setPropostaInviataA(null);
          onRefresh();
        }}
        onSelect={(servizio) => {
          setPropostaInviataA(null);
          setDettaglio(servizio);
        }}
      />
    </Screen>
  );
}

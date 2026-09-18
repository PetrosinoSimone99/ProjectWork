import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { BarraScelte } from '@/components/BarraScelte';
import { CardCandidato } from '@/components/CardCandidato';
import { CardGruppo } from '@/components/CardGruppo';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SchedaTrascinabile } from '@/components/SchedaTrascinabile';
import { Screen } from '@/components/Screen';
import { useCandidati } from '@/hooks/useCandidati';
import { useCategorie } from '@/hooks/useCategorie';
import { useCoda } from '@/hooks/useCoda';
import { useTempoResiduo } from '@/hooks/useTempoResiduo';
import {
  SCELTE_CANDIDATO,
  azioniScheda,
  descriviCandidato,
} from '@/servizi/candidati';
import { VISTE } from '@/servizi/coda';
import { nomePersona } from '@/servizi/offerta-ricerca';
import { space } from '@/theme/tokens';

/**
 * «Loop»: le persone con cui si può scambiare, **una scheda per volta**.
 *
 * Una scheda è una persona con **una** sua offerta e il motivo per cui è lì
 * (cerca quello che offro, offre quello che cerco, o entrambe le cose); se mi ha
 * già messo like la scheda lo dice e i due pulsanti diventano «Accetta» e
 * «Rifiuta». La scelta riguarda la persona **e la sua offerta**.
 *
 * Si dichiara interesse in due modi, entrambi fino in fondo: i **pulsanti**
 * (tastiera e lettore di schermo) e il **gesto** di trascinamento (comodità in
 * più, funziona anche con il mouse sul web). Nessuno dei due è un ripiego
 * dell'altro: la schermata è usabile per intero senza gesti.
 *
 * Chi decide se è un match è il **backend**: qui si mostra «Interesse
 * registrato.» e si passa oltre; solo se la risposta dice `match: true` compare
 * «È un match!» con «Apri la chat».
 *
 * A pila finita **non si ricarica da soli**: lo stato resta a schermo finché non
 * si preme «Ricarica», così si sa sempre perché non c'è più nessuno.
 */
export default function LoopScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();
  // Le categorie servono solo a **risolvere i nomi** delle offerte mostrate.
  const { categorie } = useCategorie(token);

  const {
    candidato,
    numeroScheda,
    totale,
    pilaVuota,
    pilaFinita,
    primoCaricamento,
    errore,
    esito,
    sceltaInCorso,
    ripristino,
    scegli,
    riprova,
    ricarica,
    refreshing,
    onRefresh,
  } = useCandidati({ token, utenteId: utente?.id });

  // La catena che le scelte stanno costruendo: la card qui sopra è l'unico modo
  // in cui la ricerca diventa visibile **mentre si scorre**, senza interrompere
  // lo swipe. Il dettaglio è a un tocco (`/scambi`).
  const { dati: coda, vista: vistaCoda, chiediAggiornamento } = useCoda({
    token,
    utenteId: utente?.id,
  });
  const tempoCoda = useTempoResiduo(coda?.scadenzaMs);

  // Il tempo scaduto sulla card chiede lo stato vero una volta sola: la vista
  // non cambia da sola, la dichiara il backend alla prossima lettura.
  useEffect(() => {
    if (vistaCoda === VISTE.IN_RICERCA && tempoCoda.scaduto) {
      chiediAggiornamento();
    }
  }, [vistaCoda, tempoCoda.scaduto, chiediAggiornamento]);

  // Le due azioni con un'identità **stabile**. Non è un vezzo da `useMemo`: il
  // `PanResponder` di `SchedaTrascinabile` si ricrea quando cambiano le callback,
  // e ricrearlo durante un trascinamento azzererebbe la distanza accumulata (la
  // scheda tornerebbe sotto il dito). Con questi due `useCallback` cambia solo
  // quando cambia `scegli`, cioè quando la pila avanza: mai a metà gesto.
  const interessa = useCallback(() => {
    void scegli(SCELTE_CANDIDATO.INTERESSE);
  }, [scegli]);
  const passa = useCallback(() => {
    void scegli(SCELTE_CANDIDATO.PASSA);
  }, [scegli]);

  // Il pulsante premuto si **disabilita** mentre la scelta è in volo, e il
  // browser sposta allora il focus sul `body` — **verificato nel browser**, non
  // supposto. Senza contromisura, dopo ogni scelta servirebbe un `Tab` in più
  // per tornare ai pulsanti. Qui il focus torna sul contenitore della scheda
  // appena arrivata: la scheda nuova viene letta e `Tab` riparte da «Passa»,
  // che è il primo comando dopo il contenitore.
  //
  // Il focus si sposta **solo dopo una scelta**, mai al primo caricamento: la
  // posizione cresce quando si avanza e cala quando la pila si ricarica, e il
  // fallimento di una scelta ha il suo contatore. (`focus()` è il metodo del nodo
  // DOM: su web c'è, su native è un no-op — lì servirebbe
  // `AccessibilityInfo.setAccessibilityFocus`, dichiarato nel report.)
  const schedaRef = useRef(null);
  const numeroVisto = useRef(numeroScheda);
  const ripristinoVisto = useRef(ripristino);
  useEffect(() => {
    const avanzata = numeroScheda > numeroVisto.current;
    const riprovata = ripristinoVisto.current !== ripristino;
    numeroVisto.current = numeroScheda;
    ripristinoVisto.current = ripristino;
    if (avanzata || riprovata) {
      schedaRef.current?.focus?.();
    }
  }, [numeroScheda, ripristino]);

  /** Gli stessi parametri che passa il dettaglio di un annuncio: la chat li usa per il titolo. */
  function apriChat(persona, mansione) {
    router.push({
      pathname: '/chat',
      params: {
        utenteId: String(persona.id),
        nome: persona.nome ?? '',
        cognome: persona.cognome ?? '',
        username: persona.username ?? '',
        titolo: mansione ?? '',
      },
    });
  }

  const intestazione = (
    <View style={{ gap: space.xs }}>
      <AppText variant="title">Loop</AppText>
      <AppText variant="small" tone="secondary">
        Le persone con cui puoi scambiare: scorri, decidi tu chi ti interessa.
      </AppText>
    </View>
  );

  // Con il flag attivo, **una sola** condizione sullo stato dei dati finti.
  const bannerFinti = USA_DATI_FINTI ? (
    <Banner kind="info" message={AVVISO_DEMO} />
  ) : null;

  // Primo caricamento: non c'è un contenuto precedente da conservare, quindi lo
  // spinner a schermo pieno è onesto. I ricarichi successivi no (vedi sotto).
  if (primoCaricamento && !errore) {
    return <LoadingScreen label="Cerco le persone per te…" />;
  }

  if (primoCaricamento) {
    return (
      <Screen scroll withBottomInset={false}>
        {intestazione}
        {bannerFinti}
        <Banner kind="error" message={errore} />
        <AppButton
          label="Riprova"
          variant="secondary"
          icon="refresh-outline"
          onPress={() => void riprova()}
          style={{ alignSelf: 'flex-start' }}
        />
      </Screen>
    );
  }

  const azioni = azioniScheda(candidato?.tiHaScelto);
  const idOffertaValido = Number.isInteger(candidato?.offerta?.id);

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      {intestazione}
      {bannerFinti}

      {/* L'esito della scelta: `Banner` è già una regione viva, quindi
          «Interesse registrato.» e «È un match!» vengono annunciati da soli. */}
      {esito ? (
        <View style={{ gap: space.sm }}>
          <Banner
            kind="success"
            message={
              esito.match
                ? 'È un match!'
                : esito.scelta === SCELTE_CANDIDATO.INTERESSE
                  ? 'Interesse registrato.'
                  : 'Passata.'
            }
          />
          {esito.match ? (
            <AppButton
              label="Apri la chat"
              icon="chatbubble-ellipses-outline"
              onPress={() => apriChat(esito.persona, esito.mansione)}
              accessibilityLabel={`Apri la chat con ${nomePersona(esito.persona)}`}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
        </View>
      ) : null}

      {/* Un ricarico fallito non fa sparire la scheda che c'è a schermo. */}
      {errore ? (
        <>
          <Banner kind="error" message={errore} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void riprova()}
            style={{ alignSelf: 'flex-start' }}
          />
        </>
      ) : null}

      {vistaCoda !== VISTE.NESSUNO && coda?.gruppo ? (
        <CardGruppo
          compatta
          gruppo={coda.gruppo}
          vista={vistaCoda}
          scadenzaMs={coda.scadenzaMs}
          tempo={tempoCoda}
          categorie={categorie}
          onApri={() => router.push('/scambi')}
        />
      ) : null}

      {pilaVuota ? (
        <>
          <EmptyState
            icon="people-outline"
            title="Non ci sono altre persone in questo momento"
            description="Nessuno ha ancora messo like a una tua offerta e nessuno cerca quello che offri (o offre quello che cerchi). Per entrare nel match ti serve almeno un'offerta e una ricerca pubblicate."
          />
          <View style={stileAzioniRiga}>
            <AppButton label="Ricarica" icon="refresh-outline" onPress={() => void ricarica()} />
            <AppButton
              label="Le tue catene"
              variant="secondary"
              icon="git-network-outline"
              onPress={() => router.push('/scambi')}
            />
            <AppButton
              label="Vai a Offro e cerco"
              variant="secondary"
              onPress={() => router.push('/offro-e-cerco')}
            />
          </View>
        </>
      ) : pilaFinita ? (
        <>
          <EmptyState
            icon="checkmark-done-outline"
            title="Hai visto tutte le persone di questo giro"
            description="Se qualcuno ti mette like, lo troverai qui: basta ricaricare."
          />
          <View style={stileAzioniRiga}>
            <AppButton label="Ricarica" icon="refresh-outline" onPress={() => void ricarica()} />
            <AppButton
              label="Le tue catene"
              variant="secondary"
              icon="git-network-outline"
              onPress={() => router.push('/scambi')}
            />
            <AppButton
              label="Offro e cerco"
              variant="secondary"
              onPress={() => router.push('/offro-e-cerco')}
            />
            <AppButton
              label="Guarda il catalogo"
              variant="secondary"
              onPress={() => router.push('/')}
            />
          </View>
        </>
      ) : candidato ? (
        <>
          {/* Il contenitore è focalizzabile **solo via programma** (`tabIndex`
              -1): non è un fermo in più nella sequenza dei `Tab`, è la
              destinazione del focus dopo una scelta. */}
          <View ref={schedaRef} tabIndex={-1}>
            {/* La `key` è la persona: al cambio di scheda il componente si
                rimonta e riparte dal centro. `ripristino` fa lo stesso dopo una
                scelta fallita, quando la pila **non** avanza. */}
            <SchedaTrascinabile
              key={candidato.chiave}
              ripristino={ripristino}
              disabled={sceltaInCorso !== null || !idOffertaValido}
              parolaInteressa={azioni.positiva}
              parolaPassa={azioni.negativa}
              onInteressa={interessa}
              onPassa={passa}
            >
              <CardCandidato candidato={candidato} categorie={categorie} />
            </SchedaTrascinabile>
          </View>

          <BarraScelte
            candidato={candidato}
            azioni={azioni}
            numeroScheda={numeroScheda}
            totale={totale}
            descrizione={descriviCandidato(candidato, categorie)}
            inCorso={sceltaInCorso}
            disabilitato={!idOffertaValido}
            motivoDisabilitato={
              idOffertaValido
                ? null
                : "Questa scheda non ha un riferimento all'offerta: non posso registrare la scelta."
            }
            onInteressa={interessa}
            onPassa={passa}
          />
        </>
      ) : null}
    </Screen>
  );
}

/** I pulsanti degli stati di fine pila, in riga e centrati, che vanno a capo. */
const stileAzioniRiga = {
  flexDirection: 'row',
  gap: space.sm,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
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
import { SezioneProposte } from '@/components/SezioneProposte';
import { useCandidati } from '@/hooks/useCandidati';
import { useCategorie } from '@/hooks/useCategorie';
import { useCoda } from '@/hooks/useCoda';
import { useTempoResiduo } from '@/hooks/useTempoResiduo';
import {
  SCELTE_CANDIDATO,
  azioniScheda,
  descriviCandidato,
  messaggioEsito,
} from '@/servizi/candidati';
import { VISTE } from '@/servizi/coda';
import { nomePersona } from '@/servizi/offerta-ricerca';
import { space } from '@/theme/tokens';

/**
 * «Loop»: le persone con cui si può scambiare, **una scheda per volta**, e le
 * proposte in attesa della mia decisione.
 *
 * Una scheda è una persona con **una** sua offerta e il motivo per cui è lì: il
 * feed del backend manda solo compatibilità **reciproche** (cerca quello che
 * offri e offre quello che cerchi). La scelta riguarda la persona **e la sua
 * offerta**.
 *
 * Si dichiara interesse in due modi, entrambi fino in fondo: i **pulsanti**
 * (tastiera e lettore di schermo) e il **gesto** di trascinamento (comodità in
 * più, funziona anche con il mouse sul web). Nessuno dei due è un ripiego
 * dell'altro: la schermata è usabile per intero senza gesti.
 *
 * Il flusso del match è quello vero del backend: uno swipe «Interesse» crea una
 * **proposta in attesa** («Interesse registrato.», nessun match ancora) che chi
 * la riceve trova nella sezione qui sopra e decide. Solo la risposta che dice
 * `matched: true` fa comparire «È un match!» con «Apri la chat»: qui non si
 * deduce mai niente, e il match non si mostra prima del «Sì» dell'altro.
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
    proposte,
    errore,
    esito,
    sceltaInCorso,
    decisioneInCorso,
    ripristino,
    scegli,
    accetta,
    rifiuta,
    riprova,
    ricarica,
    refreshing,
    onRefresh,
  } = useCandidati({ token });

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

  /**
   * «Apri la chat» sul match. I parametri sono il **contratto col passo 4**
   * (`temp/piani/04-chat.md`): `proposalId`, `nome`, `username` — non cambiarli
   * senza cambiare anche la chat.
   */
  function apriChat(persona, propostaId) {
    router.push({
      pathname: '/chat',
      params: {
        proposalId: String(propostaId),
        nome: persona.nome ?? '',
        username: persona.username ?? '',
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

  // Primo caricamento: non c'è un contenuto precedente da conservare, quindi lo
  // spinner a schermo pieno è onesto. I ricarichi successivi no (vedi sotto).
  if (primoCaricamento && !errore) {
    return <LoadingScreen label="Cerco le persone per te…" />;
  }

  if (primoCaricamento) {
    return (
      <Screen scroll withBottomInset={false}>
        {intestazione}
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
  // Un'azione per volta: durante una scelta o una decisione la scheda resta
  // ferma (anche il gesto) e i comandi dicono quale è in volo.
  const occupato = sceltaInCorso !== null || decisioneInCorso !== null;

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      {intestazione}

      {/* L'esito di una scelta o di una decisione: `Banner` è già una regione
          viva, quindi «Interesse registrato.» e «È un match!» vengono annunciati
          da soli. Il testo viene da `messaggioEsito`, che per gli esiti che non
          si capiscono non produce frasi inventate. */}
      {esito && messaggioEsito(esito) ? (
        <View style={{ gap: space.sm }}>
          <Banner kind="success" message={messaggioEsito(esito)} />
          {esito.match && esito.propostaId !== null ? (
            <AppButton
              label="Apri la chat"
              icon="chatbubble-ellipses-outline"
              onPress={() => apriChat(esito.persona, esito.propostaId)}
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

      {/* Le proposte in attesa della mia decisione: «Accetta»/«Rifiuta» e il
          match solo dal `matched` del backend (vedi `SezioneProposte`). */}
      <SezioneProposte
        proposte={proposte}
        categorie={categorie}
        decisioneInCorso={decisioneInCorso}
        accetta={accetta}
        rifiuta={rifiuta}
      />

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
            description="Nessuno cerca quello che offri (o offre quello che cerchi) in questo momento. Per entrare nel feed ti serve almeno un'offerta e una ricerca pubblicate."
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
            description="Le persone compatibili nuove compaiono qui: basta ricaricare."
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
              disabled={occupato}
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
            disabilitato={occupato}
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

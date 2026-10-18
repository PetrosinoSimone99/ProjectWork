import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import {
  annullaRiscatto,
  confermaRicezioneBuono,
  impegnaBuono,
  ottieniBuoni,
  ottieniCatalogo,
  ottieniRiscatti,
} from '@/api/barattolo';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { CardBuono } from '@/components/CardBuono';
import { Card } from '@/components/Card';
import { CardServizioCatalogo } from '@/components/CardServizioCatalogo';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ModalConferma } from '@/components/ModalConferma';
import { BottoneIndietro } from '@/components/BottoneIndietro';
import { Screen } from '@/components/Screen';
import { conRiscatto, descriviOrigine, raggruppaPerStato } from '@/servizi/token';
import { space, useTokens } from '@/theme/tokens';

/**
 * «I miei token»: i **buoni** dell'utente, tutti — li assegna la staff dopo una
 * segnalazione oppure arrivano come compensazione di una catena annullata — e il
 * loro ciclo sulle rotte vere (`api/aree/token.js`): impegno su un servizio del
 * catalogo, «Ho ricevuto il servizio» e «Annulla impegno».
 *
 * Nome da non confondere con il token di **accesso**: la sessione sta altrove. Il
 * buono non è una valuta: non c'è nessun saldo e non si somma. Per ogni buono c'è
 * la sua origine, la sua data di emissione e la sua scadenza, perché il modello
 * obiettivo chiede **una riga per buono**, non un numero.
 *
 * La schermata **non decide esiti e non deduce stati**:
 * - lo stato è quello che il backend manda, e un valore ignoto si mostra
 *   **grezzo** (una sezione «Altri buoni»), non tradotto a caso;
 * - ogni azione di successo **rilegge** (`carica`): il passaggio di stato lo fa
 *   il server, la UI non lo simula;
 * - «Annulla impegno» compare solo a riscatto `PENDING` (la regola è in
 *   `azioniDelBuono` di `@/servizi/token`, non duplicata qui): dopo
 *   l'accettazione resta solo la conferma di ricezione.
 *
 * Le tre azioni condividono **un solo** `ModalConferma` e una sola guardia sul
 * doppio tocco (`azioneRef`), così non partono mai due richieste insieme. La
 * decisione del **fornitore** (accettare/rifiutare il riscatto) è un'altra
 * schermata e non è qui.
 */

/** Il tipo del contratto per un'offerta: l'unica che si può pagare con un buono. */
const TIPO_OFFERTA = 'OFFER';

/** Le conferme del ciclo del buono. Nomi, non stringhe sparse. */
const TIPI_CONFERMA = {
  IMPEGNO: 'impegno',
  RICEVUTO: 'ricevuto',
  ANNULLA: 'annulla',
};

/**
 * Testi, tono e chiamata di ciascuna conferma. Il tono del pulsante segue la
 * semantica di `ModalConferma`: `primary` per le azioni reversibili o da
 * celebrare (impegnare, ricevere), `danger` — la variante **distruttiva** del
 * progetto — per l'annullamento. Le date e gli stati non si calcolano qui: dopo
 * la chiamata si rilegge e basta.
 */
const CONFERME = {
  [TIPI_CONFERMA.IMPEGNO]: {
    titolo: 'Impegnare il buono?',
    etichettaConferma: 'Impegna il buono',
    varianteConferma: 'primary',
    messaggio: (conferma) =>
      `Il buono resterà impegnato per «${conferma.servizio.descrizione}». Il proprietario del servizio deve accettare; lo confermerai qui quando avrai ricevuto il servizio.`,
    esito:
      'Buono impegnato. Il proprietario del servizio deve accettare; quando avrai ricevuto il servizio lo confermi qui. Se l\'accordo salta puoi annullare l\'impegno finché è in attesa.',
    esegui: (token, conferma) => impegnaBuono(token, conferma.buono.id, conferma.servizio.id),
  },
  [TIPI_CONFERMA.RICEVUTO]: {
    titolo: 'Hai ricevuto il servizio?',
    etichettaConferma: 'Ho ricevuto il servizio',
    varianteConferma: 'primary',
    messaggio: () => 'Il buono diventerà Usato e non si torna indietro.',
    esito: 'Buono usato. Buon lavoro!',
    esegui: (token, conferma) => confermaRicezioneBuono(token, conferma.buono.idRiscatto),
  },
  [TIPI_CONFERMA.ANNULLA]: {
    titolo: "Annullare l'impegno?",
    etichettaConferma: "Annulla l'impegno",
    varianteConferma: 'danger',
    messaggio: () => 'Il buono torna disponibile e potrai usarlo su un altro servizio.',
    esito: 'Impegno annullato: il buono è tornato disponibile.',
    esegui: (token, conferma) => annullaRiscatto(token, conferma.buono.idRiscatto),
  },
};

export default function TokenScreen() {
  const { token, utente } = useAuth();
  const t = useTokens();
  const utenteId = utente?.id;

  const [buoni, setBuoni] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [erroreAzione, setErroreAzione] = useState(null);
  const [messaggio, setMessaggio] = useState(null);

  // La scelta del servizio: il buono scelto, il catalogo e i suoi stati.
  const [buonoScelto, setBuonoScelto] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [catalogoErrore, setCatalogoErrore] = useState(null);
  const [caricamentoCatalogo, setCaricamentoCatalogo] = useState(false);

  // La conferma aperta (`{tipo, buono, servizio?}`) e la guardia sincrona sul
  // doppio tocco: una sola conferma alla volta, una sola richiesta in volo.
  const [conferma, setConferma] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(false);
  const azioneRef = useRef(false);

  // Le richieste in volo: una risposta si applica solo se nessuna più recente è
  // già partita (il focus non litiga con un «Riprova»).
  const richiestaRef = useRef(0);
  const catalogoRef = useRef(0);

  const carica = useCallback(async () => {
    if (!token) {
      return;
    }
    const seq = ++richiestaRef.current;
    setCaricamento(true);
    try {
      // Le due letture sono un tutto unico: se una delle due fallisce la
      // schermata mostra l'errore, mai una mezza verità degradata.
      const [elencoBuoni, elencoRiscatti] = await Promise.all([
        ottieniBuoni(token),
        ottieniRiscatti(token),
      ]);
      if (seq !== richiestaRef.current) {
        return;
      }
      setBuoni(conRiscatto(elencoBuoni, elencoRiscatti));
      setErrore(null);
    } catch (err) {
      if (seq !== richiestaRef.current) {
        return;
      }
      setErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      if (seq === richiestaRef.current) {
        setCaricamento(false);
      }
    }
  }, [token]);

  // Si rilegge quando la schermata torna in primo piano: un buono nuovo (una
  // notifica della staff) o un buono consumato altrove si vedono alla rilettura.
  useFocusEffect(
    useCallback(() => {
      void carica();
      return () => {
        richiestaRef.current += 1;
      };
    }, [carica]),
  );

  const caricaCatalogo = useCallback(async () => {
    if (!token || utenteId === null || utenteId === undefined) {
      return;
    }
    const seq = ++catalogoRef.current;
    setCaricamentoCatalogo(true);
    setCatalogoErrore(null);
    try {
      const { elenco } = await ottieniCatalogo(token, utenteId, {});
      if (seq !== catalogoRef.current) {
        return;
      }
      // La riserva accetta solo **offerte** di altri utenti: una `REQUEST`
      // risponderebbe `400` e comunque non si paga con un buono. Il filtro è la
      // stessa regola del server lato UI; se un giorno il catalogo portasse
      // anche le ricerche, qui va aggiunta una riga che lo dica, mai un elenco
      // più corto senza spiegazione.
      setCatalogo(elenco.filter((servizio) => servizio.tipo === TIPO_OFFERTA));
    } catch (err) {
      if (seq !== catalogoRef.current) {
        return;
      }
      setCatalogo(null);
      setCatalogoErrore(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      if (seq === catalogoRef.current) {
        setCaricamentoCatalogo(false);
      }
    }
  }, [token, utenteId]);

  function apriScelta(buono) {
    setErroreAzione(null);
    setMessaggio(null);
    setConferma(null);
    setBuonoScelto(buono);
    if (catalogo === null && !caricamentoCatalogo) {
      void caricaCatalogo();
    }
  }

  function chiudiScelta() {
    setBuonoScelto(null);
  }

  /** Apre la conferma di un'azione, chiudendo gli altri modali (uno alla volta). */
  function apriConferma(tipo, buono) {
    setErroreAzione(null);
    setMessaggio(null);
    setBuonoScelto(null);
    setConferma({ tipo, buono });
  }

  /** Scelto il servizio, il catalogo lascia il posto alla conferma (un `Modal` alla volta). */
  function scegliServizio(servizio) {
    setConferma({ tipo: TIPI_CONFERMA.IMPEGNO, buono: buonoScelto, servizio });
    setBuonoScelto(null);
  }

  async function eseguiConferma() {
    const definizione = conferma !== null ? CONFERME[conferma.tipo] : null;
    if (definizione === null || azioneRef.current) {
      return;
    }
    azioneRef.current = true;
    setAzioneInCorso(true);
    setErroreAzione(null);
    try {
      await definizione.esegui(token, conferma);
      setMessaggio(definizione.esito);
      setConferma(null);
    } catch (err) {
      // Il `409` (transizione incompatibile, buono o offerta non disponibili) si
      // mostra com'è: lo stato vero può essere diverso da quello a schermo,
      // quindi si rilegge. Nessun catch silenzioso.
      setErroreAzione(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
      setConferma(null);
    } finally {
      await carica();
      azioneRef.current = false;
      setAzioneInCorso(false);
    }
  }

  if (buoni === null && !errore) {
    return <LoadingScreen label="Guardo i tuoi token…" />;
  }

  const gruppi = raggruppaPerStato(buoni ?? []);
  const sezioni = [
    { chiave: 'disponibili', titolo: 'Disponibili', buoni: gruppi.disponibili },
    { chiave: 'impegnati', titolo: 'Impegnati', buoni: gruppi.impegnati },
    { chiave: 'usati', titolo: 'Usati', buoni: gruppi.usati },
    { chiave: 'scaduti', titolo: 'Scaduti', buoni: gruppi.scaduti },
    { chiave: 'altri', titolo: 'Altri buoni', buoni: gruppi.altri },
  ].filter((sezione) => sezione.buoni.length > 0);

  const definizione = conferma !== null ? CONFERME[conferma.tipo] : null;

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <BottoneIndietro />
        <AppText variant="title">I miei token</AppText>
      </View>

      <AppText variant="small" tone="secondary">
        Un buono per un servizio: lo assegna la staff oppure arriva da una catena annullata, e ha una
        scadenza.
      </AppText>

      {errore ? (
        <View style={{ gap: space.sm }}>
          <Banner kind="error" message={errore} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void carica()}
            loading={caricamento}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}

      {messaggio ? <Banner kind="success" message={messaggio} /> : null}
      {erroreAzione ? <Banner kind="error" message={erroreAzione} /> : null}

      {buoni !== null && buoni.length === 0 ? (
        <EmptyState
          icon="pricetag-outline"
          title="Non hai token"
          description="Il buono non si guadagna scambiando: lo assegna la staff dopo aver esaminato una segnalazione, oppure arriva come compensazione quando una catena viene annullata. Quando ne avrai uno lo troverai qui, con la sua origine e la sua scadenza."
        />
      ) : null}

      {sezioni.map((sezione) => (
        <View key={sezione.chiave} style={{ gap: space.sm }}>
          <AppText variant="heading">{sezione.titolo}</AppText>
          {sezione.buoni.map((buono) => (
            <CardBuono
              key={buono.id}
              buono={buono}
              catalogo={catalogo}
              azioneInCorso={azioneInCorso}
              onUsa={apriScelta}
              onAnnulla={(attuale) => apriConferma(TIPI_CONFERMA.ANNULLA, attuale)}
              onRicevuto={(attuale) => apriConferma(TIPI_CONFERMA.RICEVUTO, attuale)}
            />
          ))}
        </View>
      ))}

      <Modal
        visible={buonoScelto !== null}
        transparent
        animationType="fade"
        onRequestClose={chiudiScelta}
      >
        <View
          style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: space.lg }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chiudi la scelta del servizio"
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}
            disabled={azioneInCorso}
            onPress={chiudiScelta}
          />
          <Card style={{ position: 'relative', zIndex: 1, maxHeight: '80%' }}>
            <View style={{ gap: space.xs }}>
              <AppText variant="heading">Su quale servizio?</AppText>
              <AppText variant="small" tone="secondary">
                Scegli il servizio su cui usare il buono
                {descriviOrigine(buonoScelto) ? ` «${descriviOrigine(buonoScelto)}»` : ''}: resterà
                impegnato per quello scambio.
              </AppText>
            </View>

            {caricamentoCatalogo ? (
              <View style={{ alignItems: 'center', paddingVertical: space.lg }}>
                <ActivityIndicator color={t.primary} />
              </View>
            ) : null}

            {catalogoErrore ? (
              <View style={{ gap: space.sm }}>
                <Banner kind="error" message={catalogoErrore} />
                <AppButton
                  label="Riprova"
                  variant="secondary"
                  icon="refresh-outline"
                  onPress={() => void caricaCatalogo()}
                  style={{ alignSelf: 'flex-start' }}
                />
              </View>
            ) : null}

            {catalogo !== null && catalogo.length === 0 ? (
              <EmptyState
                variante="mercato"
                icon="search-outline"
                title="Nessun servizio disponibile"
                description="In questo momento non c'è nessun servizio pubblicato su cui usare il buono."
                etichettaAzione="Ricarica"
                onAzione={() => void caricaCatalogo()}
              />
            ) : null}

            {catalogo !== null && catalogo.length > 0 ? (
              <ScrollView
                style={{ maxHeight: 340 }}
                contentContainerStyle={{ gap: space.sm }}
                showsVerticalScrollIndicator
              >
                {catalogo.map((servizio) => (
                  <CardServizioCatalogo
                    key={servizio.chiave ?? String(servizio.id)}
                    servizio={servizio}
                    onPress={() => scegliServizio(servizio)}
                  />
                ))}
              </ScrollView>
            ) : null}

            <AppButton
              label="Annulla"
              variant="secondary"
              onPress={chiudiScelta}
              disabled={azioneInCorso}
            />
          </Card>
        </View>
      </Modal>

      <ModalConferma
        visible={conferma !== null}
        titolo={definizione ? definizione.titolo : ''}
        messaggio={definizione ? definizione.messaggio(conferma) : ''}
        etichettaConferma={definizione ? definizione.etichettaConferma : 'Conferma'}
        varianteConferma={definizione ? definizione.varianteConferma : 'primary'}
        loading={azioneInCorso}
        onConferma={() => void eseguiConferma()}
        onAnnulla={() => setConferma(null)}
      />
    </Screen>
  );
}

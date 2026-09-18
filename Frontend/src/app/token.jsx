import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import { impegnaToken, ottieniCatalogo, ottieniToken } from '@/api/barattolo';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { CardBuono } from '@/components/CardBuono';
import { Card } from '@/components/Card';
import { CardServizioCatalogo } from '@/components/CardServizioCatalogo';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ModalConferma } from '@/components/ModalConferma';
import { Screen } from '@/components/Screen';
import { useCategorie } from '@/hooks/useCategorie';
import { descriviOrigine, raggruppaPerStato } from '@/servizi/token';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * «I miei token»: i **buoni** che la staff ha assegnato, con origine e scadenza,
 * e l'unica azione dell'utente — usarne uno su un servizio.
 *
 * Nome da non confondere con il token di **accesso**: la sessione sta altrove. Il
 * buono non è una valuta: non c'è nessun saldo e non si somma. Per ogni buono c'è
 * la sua origine, la sua data di emissione e la sua scadenza, perché il modello
 * obiettivo chiede **una riga per buono**, non un numero.
 *
 * La schermata **non decide esiti e non deduce stati**:
 * - lo stato è quello che il backend manda, e un valore ignoto si mostra
 *   **grezzo** (una sezione «Altri buoni»), non tradotto a caso;
 * - il passaggio a «Usato» non è un'azione dell'utente: il buono si consuma
 *   quando l'accordo è concluso. Qui non c'è nessun pulsante che lo faccia, e la
 *   schermata lo vede solo **rileggendo** (apertura, focus, «Riprova»);
 * - per lo stesso motivo non c'è una sezione «Impegnati» con azioni: c'è la riga
 *   che spiega che lo chiude il sistema.
 *
 * Il bivio dei finti sta in `api/barattolo.js` (`USA_DATI_FINTI`), non qui.
 */
export default function TokenScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const utenteId = utente?.id;

  const { categorie } = useCategorie(token);

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

  // La conferma dell'impegno e la guardia sincrona sul doppio tocco.
  const [conferma, setConferma] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(false);
  const azioneRef = useRef(false);

  // Le richieste in volo: una risposta si applica solo se nessuna più recente è
  // già partita (il focus non litiga con un «Riprova»).
  const richiestaRef = useRef(0);
  const catalogoRef = useRef(0);

  const carica = useCallback(async () => {
    if (!token || utenteId === null || utenteId === undefined) {
      return;
    }
    const seq = ++richiestaRef.current;
    setCaricamento(true);
    try {
      const elenco = await ottieniToken(token, utenteId);
      if (seq !== richiestaRef.current) {
        return;
      }
      setBuoni(elenco);
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
  }, [token, utenteId]);

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
      const elenco = await ottieniCatalogo(token, utenteId, {});
      if (seq !== catalogoRef.current) {
        return;
      }
      setCatalogo(elenco);
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
    setBuonoScelto(buono);
    if (catalogo === null && !caricamentoCatalogo) {
      void caricaCatalogo();
    }
  }

  function chiudiScelta() {
    setBuonoScelto(null);
  }

  /** Scelto il servizio, il catalogo lascia il posto alla conferma (un `Modal` alla volta). */
  function scegliServizio(servizio) {
    setConferma({ buono: buonoScelto, servizio });
    setBuonoScelto(null);
  }

  async function confermaImpegno() {
    if (!conferma || azioneRef.current) {
      return;
    }
    azioneRef.current = true;
    setAzioneInCorso(true);
    setErroreAzione(null);
    try {
      await impegnaToken(token, utenteId, conferma.buono.id, conferma.servizio.id);
      setConferma(null);
      setMessaggio(
        'Buono impegnato. Si consumerà quando lo scambio sarà concluso; se lo scambio salta tornerà disponibile.',
      );
    } catch (err) {
      // Il `409` (buono già impegnato, usato o scaduto) si mostra così com'è: lo
      // stato vero può essere diverso da quello a schermo, quindi si rilegge.
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

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Torna indietro"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            backgroundColor: pressed ? t.border : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </Pressable>
        <AppText variant="title">I miei token</AppText>
      </View>

      <AppText variant="small" tone="secondary">
        Il token è un buono per un servizio qualsiasi, non una valuta: non si somma e non si
        guadagna scambiando. Ogni buono ha la sua origine e la sua scadenza, e se ne possono
        avere più di uno.
      </AppText>

      {USA_DATI_FINTI ? <Banner kind="info" message={AVVISO_DEMO} /> : null}

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
          description="Il buono non si guadagna scambiando: lo assegna la staff dopo aver esaminato una segnalazione. Quando ne avrai uno lo troverai qui, con la sua origine e la sua scadenza."
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
                icon="search-outline"
                title="Nessun servizio disponibile"
                description="In questo momento non c'è nessun servizio pubblicato su cui usare il buono. Riprova più tardi."
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
                    categorie={categorie}
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
        titolo="Impegnare il buono?"
        messaggio={
          conferma
            ? `Il buono resterà impegnato per «${conferma.servizio.mansione}». Si consumerà quando lo scambio sarà concluso; se lo scambio salta tornerà disponibile.`
            : ''
        }
        etichettaConferma="Impegna il buono"
        varianteConferma="primary"
        loading={azioneInCorso}
        onConferma={() => void confermaImpegno()}
        onAnnulla={() => setConferma(null)}
      />
    </Screen>
  );
}

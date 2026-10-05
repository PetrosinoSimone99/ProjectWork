import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Card, Chip } from '@/components/Card';
import { CardCatena } from '@/components/CardCatena';
import { CardCatenaConclusa } from '@/components/CardCatenaConclusa';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Screen } from '@/components/Screen';
import { SezioneCondizioni } from '@/components/SezioneCondizioni';
import { useCatene } from '@/hooks/useCatene';
import { ottieniMieVoci } from '@/servizi/mie-voci';
import { VISTE, formattaDataOra, separaPerStato } from '@/servizi/catene';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * «Scambi»: le catene, collegate al contratto reale (`POST|GET /api/chains`,
 * `GET /api/tokens`).
 *
 * La struttura «titolo → stato → azioni → storico» sopravvive; quello che
 * cambia è il mondo: la ricerca **non nasce più dalle scelte del Loop**, si
 * avvia **esplicitamente** con una coppia dei propri servizi; le catene sono
 * una **lista di card** (servizi diversi = catene diverse), ognuna con le sue
 * azioni; la chat di catena **esce** da questa schermata (il contratto non crea
 * chat: «The implementation never creates a chat or calls the chat manager»).
 *
 * I buoni di compensazione (`GET /api/tokens`) sono una sezione **in sola
 * lettura** e indipendente: non sono i buoni assegnati dalla staff di `/token`,
 * e il testo li tiene separati.
 *
 * Il frontend non calcola la catena e non decide esiti: stati, scadenze e
 * motivi arrivano dal backend (una scadenza a zero fa una rilettura, mai un
 * esito scritto qui).
 */
export default function ScambiScreen() {
  const { token, utente } = useAuth();
  const {
    catene,
    buoni,
    errore,
    erroreBuoni,
    azioneInCorso,
    matchDiretto,
    primoCaricamento,
    ricarica,
    ricaricaBuoni,
    avviaRicerca,
    decidi,
    proponiCondizioni,
    decidiCondizioni,
    confermaRicezione,
    annulla,
    chiediAggiornamento,
    refreshing,
    onRefresh,
  } = useCatene({ token, utenteId: utente?.id });

  const router = useRouter();

  const { attive, storico } = useMemo(() => separaPerStato(catene), [catene]);
  // Il registro si legge a ogni render: è una cache locale (localStorage/memoria),
  // cheap, e così una voce appena pubblicata compare senza remount.
  const mieVoci = ottieniMieVoci(utente?.id);

  if (primoCaricamento) {
    return <LoadingScreen label="Guardo le tue catene…" />;
  }

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <Intestazione />

      {USA_DATI_FINTI ? <Banner kind="info" message={AVVISO_DEMO} /> : null}

      {errore ? (
        <View style={{ gap: space.sm }}>
          <Banner kind="error" message={errore} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void ricarica()}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}

      {/* `matchDiretto` è in mutua esclusione con `errore` (P57): il409 del
          match diretto non è un guasto e la via d'uscita è il Loop, quindi il
          banner è informativo e porta l'azione che serve. */}
      {matchDiretto ? (
        <View style={{ gap: space.sm }}>
          <Banner
            kind="info"
            message="C'è un match diretto per questa coppia: apri il Loop per decidere sulla proposta."
          />
          <AppButton
            label="Vai al Loop"
            icon="sync-outline"
            onPress={() => router.push('/loop')}
            accessibilityLabel="Vai al Loop per decidere sulla proposta di match diretto"
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}

      <SezioneAvvio
        mieVoci={mieVoci}
        avvioInCorso={azioneInCorso?.tipo === 'avviaRicerca'}
        onAvvia={(coppia) => void avviaRicerca(coppia)}
      />

      <SezioneCatene
        attive={attive}
        azioneInCorso={azioneInCorso}
        onDecidi={(id, decisione) => void decidi(id, decisione)}
        onAnnulla={(id, motivo) => void annulla(id, motivo)}
        onProponi={(idCatena, payload) => void proponiCondizioni(idCatena, payload)}
        onDecidiCondizioni={(idCatena, idCondizioni, decisione) =>
          void decidiCondizioni(idCatena, idCondizioni, decisione)
        }
        onConfermaRicezione={(idCatena, idPrestazione) =>
          void confermaRicezione(idCatena, idPrestazione)
        }
        onTempoScaduto={chiediAggiornamento}
      />

      <SezioneBuoni
        buoni={buoni}
        errore={erroreBuoni}
        onRiprova={() => void ricaricaBuoni()}
      />

      <SezioneStorico storico={storico} />
    </Screen>
  );
}

/** Il titolo con il pulsante indietro, come le altre schermate di dettaglio. */
function Intestazione() {
  const t = useTokens();
  const router = useRouter();
  return (
    <View style={{ gap: space.xs }}>
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
        <AppText variant="title">Scambi</AppText>
      </View>
      <AppText variant="small" tone="secondary">
        Le catene di scambio: avvii una ricerca con i tuoi servizi e il sistema cerca un giro che
        soddisfa tutti.
      </AppText>
    </View>
  );
}

/** Un'opzione del form di avvio: la voce da scegliere, come pillola premibile. */
function VoceScelta({ voce, selezionata, onScegli }) {
  const t = useTokens();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: selezionata }}
      accessibilityLabel={`${voce.descrizione || 'Voce senza descrizione'}${selezionata ? ', selezionata' : ''}`}
      onPress={() => onScegli(voce.id)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        borderColor: selezionata ? t.primary : t.border,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: space.md,
        paddingVertical: space.xs,
        backgroundColor: selezionata ? t.serviceBg : 'transparent',
      })}
    >
      <AppText variant="small" numberOfLines={1} style={{ maxWidth: 240 }}>
        {voce.descrizione.trim() !== '' ? voce.descrizione : 'Voce senza descrizione'}
      </AppText>
    </Pressable>
  );
}

/**
 * «Avvia una ricerca»: la coppia (`offeredServiceId`, `requestedServiceId`) si
 * sceglie dal **registro locale** delle mie voci (vincolo 14 del piano). Se il
 * registro è vuoto la sezione è **disabilitata con stato esplicito**: si dice
 * dove trovare le voci, senza nessun form finto.
 */
function SezioneAvvio({ mieVoci, avvioInCorso, onAvvia }) {
  const router = useRouter();
  const [idOfferta, setIdOfferta] = useState(null);
  const [idRicerca, setIdRicerca] = useState(null);
  const coppiaPronta = idOfferta !== null && idRicerca !== null;

  return (
    <Card>
      <View style={{ gap: space.md }}>
        <AppText variant="heading">Avvia una ricerca</AppText>
        <AppText variant="small" tone="secondary">
          Il sistema cerca un giro di persone in cui ognuno riceve il servizio che cerca e offre il
          proprio: scegli quale tuo servizio metti in gioco e quale cerchi.
        </AppText>

        {mieVoci.offerte.length === 0 && mieVoci.ricerche.length === 0 ? (
          <>
            <EmptyState
              icon="cube-outline"
              title="Non hai voci da mettere in gioco"
              description="Per avviare una ricerca ti serve almeno un'offerta e una ricerca pubblicate: le crei da «Offro e cerco»."
            />
            <AppButton
              label="Vai a Offro e cerco"
              variant="secondary"
              icon="add-circle-outline"
              onPress={() => router.push('/offro-e-cerco')}
              style={{ alignSelf: 'flex-start' }}
            />
          </>
        ) : (
          <>
            <View style={{ gap: space.xs }}>
              <AppText variant="small" style={{ fontWeight: '600' }}>
                Offro
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                {mieVoci.offerte.map((voce) => (
                  <VoceScelta
                    key={voce.id}
                    voce={voce}
                    selezionata={idOfferta === voce.id}
                    onScegli={setIdOfferta}
                  />
                ))}
              </View>
            </View>
            <View style={{ gap: space.xs }}>
              <AppText variant="small" style={{ fontWeight: '600' }}>
                Cerco
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
                {mieVoci.ricerche.map((voce) => (
                  <VoceScelta
                    key={voce.id}
                    voce={voce}
                    selezionata={idRicerca === voce.id}
                    onScegli={setIdRicerca}
                  />
                ))}
              </View>
            </View>
            <AppButton
              label="Avvia ricerca"
              icon="git-network-outline"
              disabled={!coppiaPronta}
              loading={avvioInCorso}
              onPress={() => onAvvia({ offeredServiceId: idOfferta, requestedServiceId: idRicerca })}
              accessibilityLabel="Avvia la ricerca di una catena con la coppia scelta"
              style={{ alignSelf: 'flex-start' }}
            />
          </>
        )}
      </View>
    </Card>
  );
}

/**
 * «Le tue catene»: una card per ogni catena attiva, con le azioni della fase.
 * Le condizioni si mostrano solo sulle catene confermate (`SezioneCondizioni`
 * fa già la guardia, qui si evita di montarla del tutto).
 */
function SezioneCatene({
  attive,
  azioneInCorso,
  onDecidi,
  onAnnulla,
  onProponi,
  onDecidiCondizioni,
  onConfermaRicezione,
  onTempoScaduto,
}) {
  return (
    <View style={{ gap: space.md }}>
      <AppText variant="heading">Le tue catene</AppText>
      {attive.length === 0 ? (
        <EmptyState
          icon="people-circle-outline"
          title="Nessuna catena in corso"
          description="Avvia una ricerca con i tuoi servizi: qui compaiono la ricerca, le conferme e lo scambio fino alla fine."
        />
      ) : (
        attive.map((catena) => (
          <View key={catena.chiave} style={{ gap: space.md }}>
            <CardCatena
              catena={catena}
              azioneInCorso={azioneInCorso}
              onDecidi={onDecidi}
              onAnnulla={onAnnulla}
              onTempoScaduto={onTempoScaduto}
            />
            {catena.vista === VISTE.CATENA.CONFERMATA ? (
              <SezioneCondizioni
                catena={catena}
                azioneInCorso={azioneInCorso}
                onProponi={(payload) => onProponi(catena.id, payload)}
                onDecidiCondizioni={(idCondizioni, decisione) =>
                  onDecidiCondizioni(catena.id, idCondizioni, decisione)
                }
                onConfermaRicezione={(idPrestazione) =>
                  onConfermaRicezione(catena.id, idPrestazione)
                }
              />
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

/**
 * «Buoni di compensazione» (vincolo 9 del piano): **sola lettura**, rami di
 * loading/errore/vuoto indipendenti dal resto della schermata. Non sono i buoni
 * assegnati dalla staff: quelli stanno a `/token`, e il testo resta separato.
 */
function SezioneBuoni({ buoni, errore, onRiprova }) {
  const t = useTokens();
  if (buoni === null) {
    return (
      <Card>
        <View style={{ gap: space.sm }}>
          <AppText variant="small" tone="secondary">
            {errore ?? 'Carico i buoni di compensazione…'}
          </AppText>
          {errore ? (
            <AppButton
              label="Riprova"
              variant="secondary"
              icon="refresh-outline"
              onPress={onRiprova}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
        </View>
      </Card>
    );
  }
  return (
    <View style={{ gap: space.md }}>
      <AppText variant="heading">Buoni di compensazione delle catene</AppText>
      {errore ? (
        <View style={{ gap: space.sm }}>
          <Banner kind="error" message={errore} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={onRiprova}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : buoni.length === 0 ? (
        <EmptyState
          icon="ticket-outline"
          title="Nessun buono di compensazione"
          description="I buoni arrivano quando una catena confermata salta e tu non hai ricevuto il servizio atteso."
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {buoni.map((buono) => (
            <Card key={buono.chiave} style={{ gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                <Chip background={buono.scaduto ? t.dangerBg : t.serviceBg}>
                  <AppText
                    variant="caption"
                    style={{ color: buono.scaduto ? t.dangerText : t.serviceText }}
                  >
                    {buono.scaduto ? 'Scaduto' : 'Valido'}
                  </AppText>
                </Chip>
                <AppText variant="small" tone="secondary">
                  {`Buono n. ${buono.id}${buono.idCatena !== null ? ` · catena n. ${buono.idCatena}` : ''}`}
                </AppText>
              </View>
              {buono.scadeIl ? (
                <AppText variant="small" tone="secondary">
                  {`Scade il ${formattaDataOra(buono.scadeIl) ?? buono.scadeIl}`}
                </AppText>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

/** Lo storico: concluse e saltate insieme, in sola lettura, con vuoto dedicato. */
function SezioneStorico({ storico }) {
  return (
    <View style={{ gap: space.md }}>
      <AppText variant="heading">Le tue catene passate</AppText>
      {storico.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title="Nessuna catena per ora"
          description="Qui finiscono le catene concluse e quelle saltate: le troverai quando ne avrai fatta una."
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {storico.map((catena) => (
            <CardCatenaConclusa key={catena.chiave} catena={catena} />
          ))}
        </View>
      )}
    </View>
  );
}

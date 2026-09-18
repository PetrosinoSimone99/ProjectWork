import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Card, Chip } from '@/components/Card';
import { CardCatenaConclusa } from '@/components/CardCatenaConclusa';
import { CardGruppo } from '@/components/CardGruppo';
import { ElencoMembri } from '@/components/ElencoMembri';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ModalConferma } from '@/components/ModalConferma';
import { Screen } from '@/components/Screen';
import { SezioneChatCatena } from '@/components/SezioneChatCatena';
import { useCategorie } from '@/hooks/useCategorie';
import { useCoda } from '@/hooks/useCoda';
import { useTempoResiduo } from '@/hooks/useTempoResiduo';
import {
  VISTE,
  etichettaStatoGruppo,
  membriInOrdine,
  testoScadenza,
  testoUscita,
} from '@/servizi/coda';
import { parametriSegnalazioneDaUscita } from '@/servizi/segnalazioni';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * «Scambi»: la catena che lo swipe sta costruendo.
 *
 * Il frontend **non calcola la catena e non decide esiti**: mostra lo stato che
 * il backend gli manda (`in_coda` e `gruppo.stato`) tramite `useCoda`, e dove il
 * contratto non esiste ancora rispondono i finti, con il loro `// TODO(backend)`
 * in `api/finti/coda.js`.
 *
 * L'unica azione dell'utente è l'**uscita**, con conferma; la ricerca **non
 * riparte da qui** (nasce dalle scelte del Loop). Il tempo che scade non produce
 * un esito: fa **una** richiesta di rilettura. Le due conversazioni della catena
 * sono 1:1 e si aprono nella chat che esiste già: **nessuna chat di gruppo**.
 */
export default function ScambiScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const { categorie } = useCategorie(token);
  const {
    dati,
    vista,
    errore,
    azioneInCorso,
    primoCaricamento,
    ricarica,
    esci,
    chiediAggiornamento,
    refreshing,
    onRefresh,
  } = useCoda({ token, utenteId: utente?.id });
  const [conferma, setConferma] = useState(false);

  const gruppo = dati?.gruppo ?? null;
  const tempo = useTempoResiduo(dati?.scadenzaMs);

  // Il tempo è arrivato a zero: si **chiede** lo stato vero, una volta sola.
  useEffect(() => {
    if (vista === VISTE.IN_RICERCA && tempo.scaduto) {
      chiediAggiornamento();
    }
  }, [vista, tempo.scaduto, chiediAggiornamento]);

  /** Gli stessi parametri che usa il dettaglio di un annuncio per aprire la chat. */
  function apriChat(controparte) {
    const persona = controparte.persona;
    router.push({
      pathname: '/chat',
      params: {
        utenteId: String(persona.id),
        nome: persona.nome ?? '',
        cognome: persona.cognome ?? '',
        username: persona.username ?? '',
        titolo: controparte.offerta?.mansione ?? '',
      },
    });
  }

  async function confermaUscita() {
    const riuscita = await esci();
    if (riuscita) {
      setConferma(false);
    }
  }

  if (primoCaricamento) {
    return <LoadingScreen label="Guardo la tua catena…" />;
  }

  const membri = gruppo ? membriInOrdine(gruppo.membri) : [];
  const uscitaDaGruppo = vista === VISTE.PRONTO;
  // La segnalazione si apre **solo** dalla catena saltata e solo se il backend
  // dichiara il diritto al token: il fatto e la persona da segnalare sono quelli
  // dell'uscita, e senza una persona identificabile non c'è nessuno da segnalare
  // (`parametriSegnalazioneDaUscita` restituisce `null` anche se sono uscito io).
  const parametriSegnala =
    gruppo !== null && gruppo.puoiChiedereToken
      ? parametriSegnalazioneDaUscita(gruppo, utente?.id)
      : null;
  const testoConferma = uscitaDaGruppo
    ? {
        titolo: 'Uscire dal gruppo?',
        messaggio:
          'Il gruppo salta per tutti: gli altri partecipanti se ne accorgeranno e lo scambio non parte.',
        etichetta: 'Esci dal gruppo',
      }
    : {
        titolo: 'Uscire dalla ricerca?',
        messaggio:
          'La ricerca della catena si interrompe: le tue scelte nel Loop non verranno più usate per comporre il gruppo.',
        etichetta: 'Esci dalla ricerca',
      };

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
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
        La catena che stiamo componendo con le tue scelte: qui vedi chi c'è e con chi parlare.
      </AppText>

      {USA_DATI_FINTI ? (
        <Banner kind="info" message={AVVISO_DEMO} />
      ) : null}

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

      {vista === VISTE.NESSUNO ? (
        <Card>
          <AppText variant="heading">Nessuna ricerca in corso</AppText>
          <AppText variant="small" tone="secondary">
            La ricerca della catena parte dalle tue scelte nel Loop: qui vedi chi c'è e con chi
            parlare. Nessun match diretto diventa una catena di tre o quattro persone.
          </AppText>
          <AppButton
            label="Vai al Loop"
            icon="sync-outline"
            onPress={() => router.push('/loop')}
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>
      ) : null}

      {vista === VISTE.IN_RICERCA ? (
        <>
          {gruppo ? (
            <CardGruppo
              gruppo={gruppo}
              vista={vista}
              scadenzaMs={dati?.scadenzaMs}
              tempo={tempo}
              categorie={categorie}
            >
              <AppButton
                label="Esci dalla ricerca"
                variant="secondary"
                icon="exit-outline"
                onPress={() => setConferma(true)}
                loading={azioneInCorso}
                accessibilityLabel="Esci dalla ricerca: interrompe la ricerca della catena per te"
                style={{ alignSelf: 'flex-start' }}
              />
            </CardGruppo>
          ) : (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Chip background={t.background}>
                  <AppText variant="caption" style={{ color: t.textSecondary }}>
                    In ricerca
                  </AppText>
                </Chip>
                <AppText variant="small" tone="secondary">
                  Sto cercando le persone
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Ionicons name="time-outline" size={15} color={t.textSecondary} />
                <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
                  {testoScadenza(tempo, dati?.scadenzaMs)}
                </AppText>
              </View>
              <AppButton
                label="Esci dalla ricerca"
                variant="secondary"
                icon="exit-outline"
                onPress={() => setConferma(true)}
                loading={azioneInCorso}
                accessibilityLabel="Esci dalla ricerca: interrompe la ricerca della catena per te"
                style={{ alignSelf: 'flex-start' }}
              />
            </Card>
          )}

          {membri.length === 0 ? (
            <AppText variant="small" tone="secondary">
              Sto cercando le persone: qui compaiono man mano, con i nomi. Serve solo aspettare.
            </AppText>
          ) : (
            <ElencoMembri membri={membri} categorie={categorie} />
          )}
        </>
      ) : null}

      {vista === VISTE.PRONTO ? (
        <>
          <CardGruppo
            gruppo={gruppo}
            vista={vista}
            scadenzaMs={dati?.scadenzaMs}
            tempo={tempo}
            categorie={categorie}
          >
            <AppButton
              label="Esci dal gruppo"
              variant="danger"
              icon="exit-outline"
              onPress={() => setConferma(true)}
              loading={azioneInCorso}
              accessibilityLabel="Esci dal gruppo: la ricerca si interrompe per tutti"
              style={{ alignSelf: 'flex-start' }}
            />
          </CardGruppo>
          <ElencoMembri membri={membri} categorie={categorie} />
          <SezioneChatCatena membri={membri} onApriChat={apriChat} />
        </>
      ) : null}

      {vista === VISTE.ANNULATO ? (
        <Card>
          <AppText variant="heading">La catena è saltata</AppText>
          {testoUscita(gruppo.uscita, utente?.id) ? (
            <AppText variant="small" tone="secondary">
              {testoUscita(gruppo.uscita, utente?.id)}
              {gruppo.uscita?.quando ? ` · ${gruppo.uscita.quando}` : ''}
            </AppText>
          ) : (
            <AppText variant="small" tone="secondary">
              La ricerca è stata annullata.
            </AppText>
          )}
          {gruppo.uscita?.motivo ? (
            <AppText variant="small" tone="secondary">
              {gruppo.uscita.motivo}
            </AppText>
          ) : null}
          {parametriSegnala ? (
            <AppButton
              label="Segnala alla staff"
              variant="secondary"
              icon="flag-outline"
              onPress={() => router.push({ pathname: '/segnala', params: parametriSegnala })}
              accessibilityLabel="Segnala alla staff il fatto di questa catena"
              style={{ alignSelf: 'flex-start' }}
            />
          ) : null}
          {gruppo.puoiChiedereToken ? <RigaToken /> : null}
          <AppButton
            label="Torna al Loop"
            variant="secondary"
            icon="sync-outline"
            onPress={() => router.push('/loop')}
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>
      ) : null}

      {vista === VISTE.ANNULATO && membri.length > 0 ? (
        <ElencoMembri membri={membri} categorie={categorie} />
      ) : null}

      {vista === VISTE.NEUTRA ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <Chip background={t.background}>
              <AppText variant="caption" style={{ color: t.textSecondary }}>
                {etichettaStatoGruppo(gruppo.stato) ?? 'Stato sconosciuto'}
              </AppText>
            </Chip>
          </View>
          <AppText variant="small" tone="secondary">
            Il sistema ha comunicato uno stato che questa versione dell'app non conosce: qui c'è
            quello che sappiamo, senza tirare a indovinare un esito.
          </AppText>
          <AppButton
            label="Torna al Loop"
            variant="secondary"
            icon="sync-outline"
            onPress={() => router.push('/loop')}
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>
      ) : null}

      {vista === VISTE.NEUTRA && membri.length > 0 ? (
        <ElencoMembri membri={membri} categorie={categorie} />
      ) : null}

      <StoricoCatene gruppiConclusi={dati?.gruppiConclusi ?? []} utenteId={utente?.id} />

      <ModalConferma
        visible={conferma}
        titolo={testoConferma.titolo}
        messaggio={testoConferma.messaggio}
        etichettaConferma={testoConferma.etichetta}
        loading={azioneInCorso}
        onConferma={() => void confermaUscita()}
        onAnnulla={() => setConferma(false)}
      />
    </Screen>
  );
}

/**
 * La riga del diritto al token: compare **solo** quando il backend dichiara che
 * sono la parte danneggiata. È un pulsante che apre l'area dei buoni, accanto a
 * «Segnala alla staff» (il gesto che può far assegnare il buono): il buono lo
 * assegna la staff, quindi vedere l'elenco e segnalare il fatto sono due azioni
 * distinte.
 */
function RigaToken() {
  const t = useTokens();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Apri i tuoi token"
      onPress={() => router.push('/token')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.xs,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name="ticket-outline" size={15} color={t.accentText} style={{ marginTop: 1 }} />
      <AppText variant="small" style={{ color: t.accentText, flex: 1 }}>
        Hai offerto il tuo servizio ma non hai ricevuto quello che chiedevi: la staff può
        riconoscerti un token. Tocca qui per vedere i tuoi token.
      </AppText>
      <Ionicons name="chevron-forward" size={15} color={t.accentText} style={{ marginTop: 1 }} />
    </Pressable>
  );
}

/**
 * Lo storico: concluse e saltate insieme. È di sola lettura.
 */
function StoricoCatene({ gruppiConclusi, utenteId }) {
  return (
    <View style={{ gap: space.md }}>
      <AppText variant="heading">Le tue catene passate</AppText>
      {gruppiConclusi.length === 0 ? (
        <EmptyState
          icon="people-circle-outline"
          title="Nessuna catena per ora"
          description="Qui finiscono le catene concluse e quelle saltate: le troverai quando ne avrai fatta una."
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {gruppiConclusi.map((gruppo, indice) => (
            <CardCatenaConclusa
              key={gruppo.chiave ?? `storia-${indice}`}
              gruppo={gruppo}
              utenteId={utenteId}
            />
          ))}
        </View>
      )}
    </View>
  );
}

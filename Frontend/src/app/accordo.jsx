import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { ottieniAccordo, AZIONI_ACCORDO_API } from '@/api/barattolo';
import {
  azioniDisponibili,
  formattaData,
  formattaDurata,
  nomePartecipante,
  spiegaSituazione,
} from '@/accordi/stati';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card, Chip } from '@/components/Card';
import { ChipStatoAccordo } from '@/components/ChipStatoAccordo';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ModalConferma } from '@/components/ModalConferma';
import { Screen } from '@/components/Screen';
import { radius, space, useTokens } from '@/theme/tokens';

function readParam(value) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

/** Riga icona + testo (date dell'accordo). */
function RigaDato({ icona, testo }) {
  const t = useTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Ionicons name={icona} size={14} color={t.textSecondary} />
      <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
        {testo}
      </AppText>
    </View>
  );
}

/** Etichetta di un passo compiuto o ancora da compiere (accettazione, completamento). */
function ChipPasso({ etichetta, fatto }) {
  const t = useTokens();
  const colore = fatto ? t.successText : t.textSecondary;
  return (
    <Chip background={fatto ? t.successBg : t.background}>
      <Ionicons name={fatto ? 'checkmark-circle' : 'ellipse-outline'} size={12} color={colore} />
      <AppText variant="caption" style={{ color: colore }}>
        {etichetta}
      </AppText>
    </Chip>
  );
}

/** Un partecipante con la sua durata e i due passi: l'utente autenticato è evidenziato. */
function RigaPartecipante({ partecipante, sonoIo }) {
  const t = useTokens();
  const durata = formattaDurata(partecipante.durata_attivita);
  return (
    <View
      style={{
        gap: space.xs,
        ...(sonoIo
          ? { borderLeftWidth: 3, borderLeftColor: t.primary, paddingLeft: space.sm }
          : {}),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <AppText style={{ fontWeight: '600' }}>
          {nomePartecipante(partecipante)}
          {sonoIo ? ' (tu)' : ''}
        </AppText>
        {partecipante.username ? (
          <AppText variant="small" tone="secondary">
            @{partecipante.username}
          </AppText>
        ) : null}
      </View>
      <AppText variant="small" tone="secondary">
        Durata dell'attività: {durata ?? 'non indicata'}
      </AppText>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <ChipPasso
          etichetta={partecipante.accettazione ? 'Accettato' : 'Da accettare'}
          fatto={partecipante.accettazione === true}
        />
        <ChipPasso
          etichetta={partecipante.completamento ? 'Completato' : 'Da completare'}
          fatto={partecipante.completamento === true}
        />
      </View>
      {partecipante.descrizione_servizio ? (
        <AppText variant="small" tone="secondary">
          {partecipante.descrizione_servizio}
        </AppText>
      ) : null}
    </View>
  );
}

export default function AccordoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, utente } = useAuth();
  const t = useTokens();
  const [accordo, setAccordo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  // Azione in corso (per il `loading` del suo bottone) e azione che aspetta
  // conferma nel ModalConferma: annulla e contesta chiedono prima.
  const [azioneInCorso, setAzioneInCorso] = useState(null);
  const [conferma, setConferma] = useState(null);
  // Esito dell'ultima azione: la busta del backend dice cosa è successo.
  const [esito, setEsito] = useState(null);

  // Guardia difensiva come in chat: un id non valido è un errore esplicito, non
  // una schermata rotta.
  const idAccordo = Number(readParam(params.id));
  const idValido = Number.isInteger(idAccordo) && idAccordo > 0;

  useEffect(() => {
    let cancelled = false;

    async function carica() {
      setError(null);
      if (!idValido) {
        setLoading(false);
        setError("Accordo non valido. Apri l'accordo dall'elenco degli accordi.");
        return;
      }
      if (!token || !utente) {
        setLoading(false);
        setError('Sessione non disponibile. Torna al login e riprova.');
        return;
      }
      setLoading(true);
      try {
        const caricato = await ottieniAccordo(token, idAccordo, utente.id);
        if (!cancelled) {
          setAccordo(caricato);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void carica();
    return () => {
      cancelled = true;
    };
  }, [idAccordo, idValido, retryCount, token, utente]);

  const tornaIndietro = useCallback(() => {
    // Aprendo la rotta da un link diretto (web) non c'è nulla a cui tornare.
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/accordi');
  }, [router]);

  /**
   * Esegue l'azione scelta e ricarica il dettaglio: il backend è l'unica autorità
   * sullo stato (l'altro partecipante può aver agito nel frattempo, e il 409 è
   * sempre in agguato). Lo stato locale non viene mai aggiornato a mano.
   */
  const eseguiAzione = useCallback(
    async (azione) => {
      if (!token || !idValido || !azione) {
        return;
      }
      setConferma(null);
      setEsito(null);
      setAzioneInCorso(azione.id);
      try {
        const risultato = await AZIONI_ACCORDO_API[azione.id](token, idAccordo);
        setEsito({
          tipo: 'success',
          messaggio: risultato.messaggio || 'Operazione completata.',
        });
      } catch (err) {
        setEsito({
          tipo: 'error',
          messaggio: err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.',
        });
      } finally {
        setAzioneInCorso(null);
        // In entrambi i casi si rilegge lo stato vero: dopo un 409 l'azione non è
        // stata eseguita e l'utente deve vedere lo stato attuale, non quello che
        // credeva di avere davanti.
        setRetryCount((count) => count + 1);
      }
    },
    [idAccordo, idValido, token],
  );

  const azioni = accordo ? azioniDisponibili(accordo, utente?.id) : [];

  if (!token || !utente) {
    return <Redirect href="/login" />;
  }

  if (loading && !accordo) {
    return <LoadingScreen label="Carico l'accordo…" />;
  }

  return (
    <Screen scroll withBottomInset={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Torna indietro"
          onPress={tornaIndietro}
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
        <AppText variant="title" style={{ fontSize: 22 }}>
          Accordo
        </AppText>
      </View>

      {error ? <Banner kind="error" message={error} /> : null}
      {error ? (
        <View style={{ gap: space.sm }}>
          {idValido ? (
            <AppButton
              label="Riprova"
              variant="secondary"
              icon="refresh-outline"
              onPress={() => setRetryCount((count) => count + 1)}
            />
          ) : null}
          <AppButton
            label="Torna agli accordi"
            variant="ghost"
            icon="swap-horizontal-outline"
            onPress={() => router.replace('/accordi')}
          />
        </View>
      ) : null}

      {accordo ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
              <ChipStatoAccordo stato={accordo.stato} />
              <View style={{ flex: 1 }} />
              <AppText variant="small" tone="secondary">
                Accordo #{accordo.id}
              </AppText>
            </View>

            <AppText variant="heading">Con {nomePartecipante(accordo.altro)}</AppText>

            <View style={{ gap: space.xs }}>
              {formattaData(accordo.data_creazione) ? (
                <RigaDato
                  icona="calendar-outline"
                  testo={`Proposto il ${formattaData(accordo.data_creazione)}`}
                />
              ) : null}
              {formattaData(accordo.data_inizio) ? (
                <RigaDato icona="play-outline" testo={`Avviato il ${formattaData(accordo.data_inizio)}`} />
              ) : null}
              {formattaData(accordo.data_fine) ? (
                <RigaDato
                  icona="flag-outline"
                  testo={`Chiuso il ${formattaData(accordo.data_fine)}`}
                />
              ) : null}
            </View>
          </Card>

          <Card>
            <AppText variant="heading">Partecipanti</AppText>
            <RigaPartecipante partecipante={accordo.io} sonoIo />
            <RigaPartecipante partecipante={accordo.altro} sonoIo={false} />
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="information-circle-outline" size={18} color={t.textSecondary} />
              <AppText variant="small" tone="secondary" style={{ flex: 1 }}>
                {spiegaSituazione(accordo, utente.id)}
              </AppText>
            </View>
          </Card>

          {esito ? <Banner kind={esito.tipo} message={esito.messaggio} /> : null}

          {/* Nessuna azione negli stati COMPLETATO, ANNULLATO e CONTESTATO:
              l'accordo è di sola lettura (per il contestato la lite si risolve
              in chat, come dice la spiegazione qui sopra). */}
          {azioni.length > 0 ? (
            <View style={{ gap: space.sm }}>
              {azioni.map((azione) => (
                <AppButton
                  key={azione.id}
                  label={azione.etichetta}
                  variant={azione.variante}
                  icon={azione.icona}
                  loading={azioneInCorso === azione.id}
                  disabled={azioneInCorso !== null}
                  onPress={() =>
                    azione.conferma ? setConferma(azione) : void eseguiAzione(azione)
                  }
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      <ModalConferma
        visible={conferma !== null}
        titolo={conferma?.conferma?.titolo}
        messaggio={conferma?.conferma?.messaggio}
        etichettaConferma={conferma?.conferma?.etichettaConferma}
        onConferma={() => void eseguiAzione(conferma)}
        onAnnulla={() => setConferma(null)}
        loading={azioneInCorso !== null}
      />
    </Screen>
  );
}

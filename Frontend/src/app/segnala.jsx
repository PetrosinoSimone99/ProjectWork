import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { creaSegnalazione } from '@/api/barattolo';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { nomePersona } from '@/servizi/offerta-ricerca';
import {
  ELENCO_MOTIVI,
  ETICHETTE_MOTIVO,
  LIMITE_DESCRIZIONE,
  aPayloadSegnalazione,
  riferimentoDaParametri,
  testoRiferimento,
  validaSegnalazione,
} from '@/servizi/segnalazioni';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * «Segnala alla staff»: l'unica leva contro chi non mantiene la parola.
 *
 * La schermata arriva **da un fatto concreto** — una catena saltata o un accordo
 * non rispettato — e il fatto è nei parametri della rotta (`id_gruppo`,
 * `utente_id`, i dati della persona): si mostra in **sola lettura** e non si
 * modifica. Dalla home e dal Loop non si arriva qui: non si segnala «una persona
 * qualsiasi» (`AGENTS.md`, e il piano 09).
 *
 * Tre decisioni che stanno qui e non nel layer API:
 * - **chi segnala** non compare in nessun campo: viaggia nel token di accesso. Il
 *   form non lo chiede perché l'utente è quello;
 * - **nessuna promessa di esito**: dopo l'invio si torna alla catena e la riga lo
 *   dice — la staff decide, e se non prende provvedimenti non arriva nessuna
 *   notifica. Il form non anticipa né sospensione né token;
 * - **i motivi sono una lista a scelta**, non testo libero: sono quelli decisi il
 *   18 settembre 2026 e restano segnaposto dichiarati (`// TODO(backend)` nel
 *   bivio dei finti). Il racconto libero è la `descrizione`, facoltativa.
 *
 * Non c'è nessun caricamento iniziale: quello che serve è già nei parametri, e non
 * esiste un endpoint che legga una segnalazione. L'unica attesa è l'**invio**.
 */
export default function SegnalaScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const parametri = useLocalSearchParams();

  const riferimento = riferimentoDaParametri(parametri);
  const segnalatoId = Number(parametri.utente_id);
  const idSegnalato = Number.isInteger(segnalatoId) && segnalatoId > 0 ? segnalatoId : null;
  const nomeSegnalato = nomePersona({
    nome: parametri.nome,
    cognome: parametri.cognome,
    username: parametri.username,
  });
  const apribile = riferimento !== null && idSegnalato !== null;

  const [motivo, setMotivo] = useState(null);
  const [descrizione, setDescrizione] = useState('');
  const [errori, setErrori] = useState({});
  const [invio, setInvio] = useState(false);
  const [erroreInvio, setErroreInvio] = useState(null);
  const [messaggio, setMessaggio] = useState(null);
  const [inviata, setInviata] = useState(false);

  const dati = { motivo, descrizione, riferimento, segnalatoId: idSegnalato };
  const valida = Object.keys(validaSegnalazione(dati)).length === 0;

  /** Toglie l'errore di un campo appena lo si corregge, senza mutare lo stato. */
  function pulisciErrore(campo) {
    setErrori((precedenti) => {
      if (!precedenti[campo]) {
        return precedenti;
      }
      const copia = { ...precedenti };
      delete copia[campo];
      return copia;
    });
  }

  function scegliMotivo(valore) {
    setMotivo(valore);
    pulisciErrore('motivo');
  }

  function cambiaDescrizione(testo) {
    setDescrizione(testo);
    pulisciErrore('descrizione');
  }

  async function invia() {
    if (invio) {
      return;
    }
    const trovati = validaSegnalazione(dati);
    setErrori(trovati);
    if (Object.keys(trovati).length > 0) {
      return;
    }

    setInvio(true);
    setErroreInvio(null);
    try {
      const esito = await creaSegnalazione(token, utente?.id, aPayloadSegnalazione(dati));
      setMessaggio(esito.messaggio || 'Segnalazione inviata alla staff.');
      setInviata(true);
    } catch (err) {
      setErroreInvio(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setInvio(false);
    }
  }

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
        <AppText variant="title">Segnala alla staff</AppText>
      </View>

      <AppText variant="small" tone="secondary">
        La segnalazione arriva alla staff, che la esamina e decide. Racconta il fatto: qui non si
        assegnano punteggi né token, e la decisione non è dell'app.
      </AppText>

      {USA_DATI_FINTI ? <Banner kind="info" message={AVVISO_DEMO} /> : null}

      {!apribile ? (
        <>
          <EmptyState
            icon="alert-circle-outline"
            title="Manca il fatto da segnalare"
            description="Questa schermata si apre da una catena saltata o da un accordo non rispettato: da lì arrivano la persona e il riferimento. Riapri la segnalazione da lì."
          />
          <AppButton
            label="Torna indietro"
            variant="secondary"
            icon="arrow-back-outline"
            onPress={() => router.back()}
            style={{ alignSelf: 'flex-start' }}
          />
        </>
      ) : null}

      {apribile && inviata ? (
        <Card>
          <AppText variant="heading">Segnalazione inviata</AppText>
          <Banner kind="success" message={messaggio} />
          <AppText variant="small" tone="secondary">
            La staff la esaminerà. Se prenderà provvedimenti riceverai un avviso nell'app; se non ne
            prenderà, non arriverà nessuna notifica.
          </AppText>
          <AppButton
            label="Torna alla catena"
            icon="arrow-back-outline"
            onPress={() => router.back()}
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>
      ) : null}

      {apribile && !inviata ? (
        <>
          <Card>
            <AppText variant="heading">Il fatto</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="person-outline" size={16} color={t.textSecondary} />
              <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
                {`Segnali ${nomeSegnalato}`}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="lock-closed-outline" size={16} color={t.textSecondary} />
              <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
                {`Riguarda ${testoRiferimento(riferimento)}: il riferimento arriva dalla catena e non si modifica qui.`}
              </AppText>
            </View>
            {errori.riferimento || errori.segnalato ? (
              <AppText variant="small" tone="danger">
                {errori.riferimento ?? errori.segnalato}
              </AppText>
            ) : null}
          </Card>

          <Card>
            <View style={{ gap: space.xs }}>
              <AppText variant="small" style={{ fontWeight: '600' }}>
                Motivo
              </AppText>
              <AppText variant="small" tone="secondary">
                Scegli quello che descrive il fatto. Il racconto libero va nella descrizione.
              </AppText>
            </View>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Motivo della segnalazione"
              style={{ gap: space.xs }}
            >
              {ELENCO_MOTIVI.map((valore) => {
                const scelto = motivo === valore;
                return (
                  <Pressable
                    key={valore}
                    accessibilityRole="radio"
                    accessibilityLabel={ETICHETTE_MOTIVO[valore]}
                    accessibilityState={{ checked: scelto }}
                    aria-checked={scelto}
                    onPress={() => scegliMotivo(valore)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.sm,
                      paddingVertical: space.sm,
                      paddingHorizontal: space.sm,
                      borderRadius: radius.input,
                      backgroundColor: pressed ? t.border : 'transparent',
                    })}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: scelto ? t.primary : t.border,
                        backgroundColor: t.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {scelto ? (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: radius.pill,
                            backgroundColor: t.primary,
                          }}
                        />
                      ) : null}
                    </View>
                    <AppText variant="small" style={{ flex: 1 }}>
                      {ETICHETTE_MOTIVO[valore]}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {errori.motivo ? (
              <AppText variant="small" tone="danger">
                {errori.motivo}
              </AppText>
            ) : null}
          </Card>

          <Card>
            <AppInput
              label="Descrizione (facoltativa)"
              value={descrizione}
              onChangeText={cambiaDescrizione}
              placeholder="Racconta cosa è successo: date, cosa era stato concordato, cosa non è stato fatto."
              multiline
              autoCapitalize="sentences"
              maxLength={LIMITE_DESCRIZIONE}
              contatore={`${descrizione.length}/${LIMITE_DESCRIZIONE}`}
              error={errori.descrizione}
            />
            <AppText variant="small" tone="secondary">
              La descrizione è facoltativa ma aiuta la staff a decidere: senza il racconto resta solo
              il motivo.
            </AppText>
          </Card>

          {erroreInvio ? (
            <View style={{ gap: space.sm }}>
              <Banner kind="error" message={erroreInvio} />
              <AppButton
                label="Riprova"
                variant="secondary"
                icon="refresh-outline"
                onPress={() => void invia()}
                loading={invio}
                style={{ alignSelf: 'flex-start' }}
              />
            </View>
          ) : null}

          <AppButton
            label="Invia alla staff"
            icon="send-outline"
            onPress={() => void invia()}
            loading={invio}
            accessibilityLabel={`Invia la segnalazione alla staff${nomeSegnalato ? ` su ${nomeSegnalato}` : ''}`}
            style={{ alignSelf: 'flex-start' }}
          />
          {!valida ? (
            <AppText variant="small" tone="secondary">
              Per inviare servono il motivo e il riferimento al fatto.
            </AppText>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

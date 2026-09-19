import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import {
  chiudiSegnalazione,
  ottieniSegnalazioniStaff,
  prendiInCaricoSegnalazione,
} from '@/api/barattolo';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { BarraStatoStaff } from '@/components/BarraStatoStaff';
import { CardSegnalazioneStaff } from '@/components/CardSegnalazioneStaff';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ModalConferma } from '@/components/ModalConferma';
import { SchedaChiusuraSegnalazione } from '@/components/SchedaChiusuraSegnalazione';
import { Screen } from '@/components/Screen';
import { STATI_SEGNALAZIONE } from '@/servizi/segnalazioni';
import { conEsito, descriviEsiti, richiedeToken, validaChiusura } from '@/servizi/staff';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * «Area staff»: l'esame delle segnalazioni.
 *
 * Non è una sesta tab: è una rotta secondaria con la freccia di ritorno, aperta
 * dal Profilo **solo** quando `utente.ruolo` è `STAFF` o `ADMIN` (la voce la
 * nasconde la UI, la protezione è del backend). La schermata legge l'elenco,
 * filtra per stato, prende in carico una pratica e la chiude con uno o più esiti.
 *
 * Quattro decisioni che stanno qui e non altrove:
 * - **il ruolo è finto e dichiarato**: il `Banner` in cima e il `// TODO(backend)`
 *   in `api/finti/accesso.js` lo dicono. Questa schermata non finge di proteggere
 *   niente: ogni azione gestisce il `403` come un caso normale;
 * - **il `409` è un caso previsto**: se la pratica è già stata chiusa da un altro,
 *   si mostra il messaggio del backend e si **ricarica**, perché lo stato a
 *   schermo può essere vecchio;
 * - **la conferma è obbligatoria**: l'esito cambia la vita di due persone, quindi
 *   `ModalConferma` riassume cosa sta per succedere prima di chiamare l'API;
 * - **la regola dell'esclusività è visibile**: «nessun provvedimento» disabilita
 *   le altre caselle e la scheda lo dice (vedi `servizi/staff.js`).
 *
 * Il bivio dei finti sta in `api/barattolo.js` (`USA_DATI_FINTI`), non qui.
 */

/** Il vuoto si dice diverso per ogni filtro: «nessuna aperta» non è «nessuna». */
function testoVuoto(filtro) {
  if (filtro === STATI_SEGNALAZIONE.OPEN) {
    return 'Non c\'è nessuna segnalazione aperta.';
  }
  if (filtro === STATI_SEGNALAZIONE.IN_REVIEW) {
    return 'Non c\'è nessuna segnalazione in esame.';
  }
  if (filtro === STATI_SEGNALAZIONE.CLOSED) {
    return 'Non c\'è nessuna segnalazione chiusa.';
  }
  return 'Non c\'è nessuna segnalazione.';
}

export default function StaffScreen() {
  const { token, utente } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const utenteId = utente?.id;

  const [filtro, setFiltro] = useState(null);
  const [segnalazioni, setSegnalazioni] = useState(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(null);
  const [erroreAzione, setErroreAzione] = useState(null);
  const [messaggio, setMessaggio] = useState(null);
  const [azioneInCorso, setAzioneInCorso] = useState(null);

  // La chiusura in corso di compilazione e la conferma finale (due `Modal` mai insieme).
  const [chiusura, setChiusura] = useState(null);
  const [erroriChiusura, setErroriChiusura] = useState({});
  const [conferma, setConferma] = useState(null);

  // Le richieste in volo: una risposta si applica solo se nessuna più recente è
  // già partita (il cambio di filtro non litiga con un «Riprova»).
  const richiestaRef = useRef(0);
  const azioneRef = useRef(false);

  const carica = useCallback(async () => {
    if (!token || utenteId === null || utenteId === undefined) {
      return;
    }
    const seq = ++richiestaRef.current;
    setCaricamento(true);
    try {
      const elenco = await ottieniSegnalazioniStaff(token, utenteId, filtro);
      if (seq !== richiestaRef.current) {
        return;
      }
      setSegnalazioni(elenco);
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
  }, [token, utenteId, filtro]);

  // Si rilegge quando la schermata torna in primo piano e a ogni cambio di filtro.
  useFocusEffect(
    useCallback(() => {
      void carica();
      return () => {
        richiestaRef.current += 1;
      };
    }, [carica]),
  );

  async function prendiInCarico(segnalazione) {
    if (azioneRef.current) {
      return;
    }
    azioneRef.current = true;
    setAzioneInCorso('carico');
    setErroreAzione(null);
    setMessaggio(null);
    try {
      await prendiInCaricoSegnalazione(token, utenteId, segnalazione.id);
      setMessaggio('Segnalazione presa in carico: ora è «In esame».');
    } catch (err) {
      // Il `409` (già presa o chiusa) e il `403` (non sei staff) si mostrano così
      // come sono: l'elenco resta, e la ricarica in coda rimette lo stato vero.
      setErroreAzione(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      await carica();
      azioneRef.current = false;
      setAzioneInCorso(null);
    }
  }

  function apriChiusura(segnalazione) {
    setErroreAzione(null);
    setMessaggio(null);
    setErroriChiusura({});
    setChiusura({ segnalazione, esiti: [], nota: '', idBeneficiario: null });
  }

  function chiudiChiusura() {
    setChiusura(null);
    setErroriChiusura({});
  }

  function cambiaEsito(esito) {
    setChiusura((precedente) => {
      if (!precedente) {
        return precedente;
      }
      const esiti = conEsito(precedente.esiti, esito);
      return {
        ...precedente,
        esiti,
        // Senza `TOKEN_ASSEGNATO` la scelta del beneficiario non ha più senso.
        idBeneficiario: richiedeToken(esiti) ? precedente.idBeneficiario : null,
      };
    });
    setErroriChiusura({});
  }

  function cambiaNota(nota) {
    setChiusura((precedente) => (precedente ? { ...precedente, nota } : precedente));
  }

  function cambiaBeneficiario(idBeneficiario) {
    setChiusura((precedente) => (precedente ? { ...precedente, idBeneficiario } : precedente));
    setErroriChiusura({});
  }

  /** La validazione: se passa, si passa alla conferma; altrimenti si resta sul form. */
  function rivediChiusura() {
    if (!chiusura) {
      return;
    }
    const trovati = validaChiusura(chiusura.esiti, chiusura.nota, chiusura.idBeneficiario);
    setErroriChiusura(trovati);
    if (Object.keys(trovati).length > 0) {
      return;
    }
    setConferma({ ...chiusura });
    setChiusura(null);
  }

  async function confermaChiusura() {
    if (!conferma || azioneRef.current) {
      return;
    }
    azioneRef.current = true;
    setAzioneInCorso('chiusura');
    setErroreAzione(null);
    setMessaggio(null);
    try {
      const esito = await chiudiSegnalazione(
        token,
        utenteId,
        conferma.segnalazione.id,
        conferma.esiti,
        conferma.nota,
        conferma.idBeneficiario,
      );
      setMessaggio(
        esito.idToken !== null
          ? 'Segnalazione chiusa. Il token è stato assegnato: lo trovi in «I miei token».'
          : 'Segnalazione chiusa.',
      );
      setConferma(null);
    } catch (err) {
      setErroreAzione(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
      setConferma(null);
    } finally {
      await carica();
      azioneRef.current = false;
      setAzioneInCorso(null);
    }
  }

  if (segnalazioni === null && !errore) {
    return <LoadingScreen label="Guardo le segnalazioni…" />;
  }

  const beneficiario = conferma
    ? (conferma.segnalazione.partecipanti.find(
        (persona) => Number(persona.id) === Number(conferma.idBeneficiario),
      ) ?? null)
    : null;
  const fraseConferma = conferma
    ? descriviEsiti(conferma.esiti, {
        segnalato: conferma.segnalazione.segnalato,
        beneficiario,
      })
    : '';
  const notaConferma = conferma?.nota?.trim();

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
        <AppText variant="title">Area staff</AppText>
      </View>

      {/* L'altra sezione dell'area staff: sono due file e due rotte, non due
          tab, e ognuno rimanda all'altro. */}
      <AppButton
        label="Utenti"
        variant="ghost"
        icon="people-outline"
        accessibilityLabel="Apri gli utenti dell'area staff"
        onPress={() => router.push('/staff-utenti')}
        style={{ alignSelf: 'flex-start' }}
      />

      <AppText variant="small" tone="secondary">
        Esamina le segnalazioni, prendile in carico e chiudile con un esito. L'esito cambia la vita
        di due persone: la nota dice su cosa si è basata la decisione, e chiudi solo dopo aver
        riletto il riepilogo.
      </AppText>

      {USA_DATI_FINTI ? <Banner kind="info" message={AVVISO_DEMO} /> : null}

      {/* La regola della UI, dichiarata a chi la prova: nascondere non è proteggere. */}
      <AppText variant="small" tone="secondary">
        Questa schermata nasconde le azioni, ma a decidere chi può farle è il backend: se una
        chiamata non è permessa risponde `403` e la schermata lo mostra.
      </AppText>

      <BarraStatoStaff filtro={filtro} onChange={setFiltro} disabled={caricamento} />

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

      {segnalazioni !== null && segnalazioni.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="Niente da esaminare"
          description={`${testoVuoto(filtro)} Quando qualcuno segnala un fatto concreto, la pratica compare qui.`}
        />
      ) : null}

      {(segnalazioni ?? []).map((segnalazione) => (
        <CardSegnalazioneStaff
          key={segnalazione.id}
          segnalazione={segnalazione}
          azioneInCorso={azioneInCorso}
          onPrendiInCarico={() => void prendiInCarico(segnalazione)}
          onApriChiusura={() => apriChiusura(segnalazione)}
        />
      ))}

      <Modal
        visible={chiusura !== null}
        transparent
        animationType="fade"
        onRequestClose={chiudiChiusura}
      >
        <View
          style={{ flex: 1, backgroundColor: t.overlay, justifyContent: 'center', padding: space.lg }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chiudi la scheda di chiusura"
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}
            disabled={azioneInCorso !== null}
            onPress={chiudiChiusura}
          />
          <ScrollView style={{ maxHeight: '85%' }}>
            {chiusura ? (
              <SchedaChiusuraSegnalazione
                segnalazione={chiusura.segnalazione}
                esiti={chiusura.esiti}
                nota={chiusura.nota}
                idBeneficiario={chiusura.idBeneficiario}
                errori={erroriChiusura}
                azioneInCorso={azioneInCorso === 'chiusura'}
                onCambiaEsito={cambiaEsito}
                onCambiaNota={cambiaNota}
                onCambiaBeneficiario={cambiaBeneficiario}
                onConferma={rivediChiusura}
                onAnnulla={chiudiChiusura}
              />
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <ModalConferma
        visible={conferma !== null}
        titolo="Chiudere la segnalazione?"
        messaggio={
          conferma
            ? `${fraseConferma}${
                notaConferma ? `\n\nNota: ${notaConferma}` : ''
              }\n\nDopo la chiusura la pratica non si riapre.`
            : ''
        }
        etichettaConferma="Chiudi la segnalazione"
        loading={azioneInCorso === 'chiusura'}
        onConferma={() => void confermaChiusura()}
        onAnnulla={() => setConferma(null)}
      />

      {/* Il dettaglio completo si legge nella card; questa riga serve solo a
          ricordare che il nome è quello del segnalato, non dell'autore. */}
      {segnalazioni !== null && segnalazioni.length > 0 ? (
        <AppText variant="small" tone="secondary">
          Ogni card riguarda la persona segnalata: «Prendi in carico» e «Chiudi» agiscono su di
          lei.
        </AppText>
      ) : null}
    </Screen>
  );
}

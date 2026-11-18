import { useCallback, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/api/client';
import {
  acceptAgreementSheet,
  cancelAgreement,
  listAgreements,
  sendAgreementSheet,
} from '@/api';
import { useAuth } from '@/auth/auth-context';
import { useChat } from '@/hooks/useChat';
import { AgreementFormModal } from '@/components/AgreementFormModal';
import { AgreementSheet } from '@/components/AgreementSheet';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Banner } from '@/components/Banner';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { MessageBubble } from '@/components/MessageBubble';
import { MessageComposer } from '@/components/MessageComposer';
import { ModalShell } from '@/components/ModalShell';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { sheetsFor, statoScheda } from '@/services/agreements';
import { space } from '@/theme/tokens';

/** The header's line when the other person has not written yet. */
const FRASE_GENERICA = 'Messaggi dello scambio: accordatevi qui sui dettagli.';

/** Copy of the line under the header, per state of the sheet read. */
const SCHEDA_IN_LETTURA = 'Carico la scheda dell’accordo…';
const SCHEDA_NON_TROVATA =
  'Non trovo questo scambio fra i tuoi accordi: la scheda non è disponibile da qui.';
const SCHEDA_NON_IN_CORSO = 'Lo scambio non è in corso: la scheda non si può più inviare.';
const SCHEDA_IN_ATTESA =
  'La scheda la scrive chi ha proposto lo scambio: la vedi qui appena arriva, e allora tocca a te confermarla.';

/**
 * The line under the header when there is no sheet button to draw, or `null`
 * when the button is the whole answer. Loading, not-found, closed exchange and
 * "the sheet is not mine to write" are four different facts and none of them is
 * silence.
 */
function rigaScheda({ accordo, letto, caricamento, errore, stato }) {
  if (errore) {
    return null; // the Banner above says it, with its own retry
  }
  if (accordo === null) {
    return !letto || caricamento ? SCHEDA_IN_LETTURA : SCHEDA_NON_TROVATA;
  }
  if (accordo.stato !== 'ACCEPTED') {
    return SCHEDA_NON_IN_CORSO;
  }
  // `null` means this viewer has no row to write: a queue-born agreement gives
  // the sheet to the provider alone.
  return stato === null ? SCHEDA_IN_ATTESA : null;
}

/**
 * «Chat»: the conversation of one accepted exchange, at
 * `/chat/<agreementId>`.
 *
 * It is a screen and not a panel of the agreement card: a composer anchored to
 * the bottom of the viewport cannot live inside a card of a scrolling tab
 * (brief, decision 1). The entry point is the "Apri chat" action of an
 * `ACCEPTED` row; the route only exists with a session (`app/_layout.jsx`).
 *
 * The delivery sheet lives here too, because it is a step of the conversation
 * and not a datum of the list: one button opens it — "Crea accordo" while
 * nobody has sent it, "Accordo" once it exists — and what it opens depends on
 * `statoScheda` of `services/agreements.js`. The first participant who sends
 * the sheet locks the round: the other one reads it and can only confirm or
 * refuse it.
 *
 * The agreement itself is read with `listAgreements` (no new endpoint) and
 * looked up by the id of this route, on every focus: accepting or confirming a
 * sheet changes what the button has to say. A failed read is a Banner with its
 * retry, and a chat opened on an agreement the viewer does not participate in
 * says so instead of drawing a button that cannot work.
 *
 * The subtitle is never invented: the other person's username is read from the
 * messages already on screen, so a chat nobody has written in keeps a generic
 * sentence instead of a name the screen cannot know. A long chat scrolls to the
 * newest message, because that is where the conversation is.
 *
 * States, all explicit: first read (`LoadingScreen`), loaded and empty
 * (`EmptyState`, decision 3 of the brief), read failure (`Banner` + retry,
 * keeping the messages already on screen), failed send (`Banner` above the
 * composer, with the draft kept: the composer clears only on `true`), and the
 * sheet's own state under the header.
 */
export default function ChatScreen() {
  const { token, utente } = useAuth();
  const params = useLocalSearchParams();
  const listaRef = useRef(null);

  // The router hands the segment over as a string (or an array on web).
  const grezzo = Array.isArray(params.agreementId) ? params.agreementId[0] : params.agreementId;
  const numero = Number(grezzo);
  const agreementId = Number.isInteger(numero) && numero > 0 ? numero : null;
  const myUsername = utente?.username ?? null;

  const { chatId, messaggi, caricamento, errore, inviando, erroreInvio, invia, ricarica } = useChat(
    { token, agreementId },
  );

  const [accordo, setAccordo] = useState(null);
  const [letto, setLetto] = useState(false);
  const [caricamentoAccordo, setCaricamentoAccordo] = useState(false);
  const [erroreAccordo, setErroreAccordo] = useState(null);
  const [schedaAperta, setSchedaAperta] = useState(false);

  const caricaAccordo = useCallback(async () => {
    if (!token || !Number.isInteger(agreementId)) {
      return;
    }
    setCaricamentoAccordo(true);
    setErroreAccordo(null);
    try {
      const elenco = await listAgreements(token);
      setAccordo(elenco.find((riga) => riga.id === agreementId) ?? null);
    } catch (err) {
      setErroreAccordo(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setLetto(true);
      setCaricamentoAccordo(false);
    }
  }, [token, agreementId]);

  useFocusEffect(
    useCallback(() => {
      void caricaAccordo();
    }, [caricaAccordo]),
  );

  // The three sheet moves of this screen. Each one throws what the component
  // shows ("not sent", "not confirmed"), and reloads the agreement so the
  // button and the sheet describe the new state.
  const inviaScheda = useCallback(
    async ({ agreementId: id, notes }) => {
      if (!token) {
        throw new Error('Sessione assente.');
      }
      await sendAgreementSheet(token, { agreementId: id, notes });
      await caricaAccordo();
    },
    [token, caricaAccordo],
  );

  const confermaScheda = useCallback(async () => {
    if (!token) {
      throw new Error('Sessione assente.');
    }
    await acceptAgreementSheet(token, agreementId);
    await caricaAccordo();
  }, [token, agreementId, caricaAccordo]);

  // Refusing the sheet ends the exchange: `cancel-agreement` is the only route
  // that closes an accepted agreement, and refusing the details leaves nothing
  // else to do with it.
  const rifiutaScheda = useCallback(async () => {
    if (!token) {
      throw new Error('Sessione assente.');
    }
    await cancelAgreement(token, agreementId);
    await caricaAccordo();
  }, [token, agreementId, caricaAccordo]);

  if (agreementId === null) {
    return (
      <Screen scroll withBottomInset={false}>
        <PageHeader titolo="Chat" indietro={<BackButton />} />
        <EmptyState
          icon="chatbubbles-outline"
          title="Scambio non riconosciuto"
          description="Il collegamento non porta a uno scambio: torna agli accordi e apri la chat da lì."
        />
      </Screen>
    );
  }

  const controparte =
    (messaggi ?? []).find(
      (messaggio) => messaggio.autore !== null && messaggio.autore !== myUsername,
    )?.autore ?? null;
  const primaLettura = messaggi === null;
  const vuota = messaggi !== null && messaggi.length === 0;

  const statoDellaScheda = accordo === null ? null : statoScheda(accordo, myUsername);
  const { mia, altra } = accordo === null ? { mia: null, altra: null } : sheetsFor(accordo, myUsername);
  // Whatever the state, the sheet on screen is the one the viewer has to read:
  // their own while they wait for a confirmation, the other side's when the
  // confirmation is theirs to give and once it is given.
  const schedaMostrata = statoDellaScheda === 'inAttesaDiConferma' ? mia : altra;
  const titoloScheda =
    statoDellaScheda === 'inAttesaDiConferma'
      ? 'La tua scheda'
      : controparte === null
        ? "La scheda dell'altra persona"
        : `La scheda di @${controparte}`;
  const riga = rigaScheda({
    accordo,
    letto,
    caricamento: caricamentoAccordo,
    errore: erroreAccordo,
    stato: statoDellaScheda,
  });

  return (
    <Screen scroll={false} bottomSpacing={space.sm}>
      <PageHeader
        titolo="Chat"
        frase={controparte === null ? FRASE_GENERICA : `Scambio con @${controparte}`}
        indietro={<BackButton />}
      />

      {erroreAccordo ? (
        <Banner
          kind="error"
          message={erroreAccordo}
          etichettaAzione="Riprova"
          onAzione={() => void caricaAccordo()}
          caricamentoAzione={caricamentoAccordo}
        />
      ) : null}

      {riga !== null ? (
        <AppText variant="small" tone="secondary">
          {riga}
        </AppText>
      ) : null}

      {accordo !== null && accordo.stato === 'ACCEPTED' && statoDellaScheda !== null ? (
        <AppButton
          label={statoDellaScheda === 'daCompilare' ? 'Crea accordo' : 'Accordo'}
          icon="document-text-outline"
          variant="secondary"
          onPress={() => setSchedaAperta(true)}
        />
      ) : null}

      {/* `messaggi === null` is the state before the first answer lands, which
          is also the first frame, before the focus effect has asked anything:
          the spinner is owed there too, not only while a request flies. */}
      {primaLettura && errore === null ? <LoadingScreen /> : null}

      {errore ? (
        <Banner
          kind="error"
          message={errore}
          etichettaAzione="Riprova"
          onAzione={() => void ricarica()}
          caricamentoAzione={caricamento}
        />
      ) : null}

      {vuota && !errore ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="Nessun messaggio"
          description="Scrivete il primo per mettervi d'accordo sui dettagli dello scambio."
        />
      ) : null}

      <View style={{ flex: 1, gap: space.sm }}>
        {messaggi !== null && messaggi.length > 0 ? (
          <FlatList
            ref={listaRef}
            style={{ flex: 1 }}
            data={messaggi}
            keyExtractor={(messaggio) => String(messaggio.id)}
            renderItem={({ item }) => <MessageBubble messaggio={item} myUsername={myUsername} />}
            contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm }}
            onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
          />
        ) : null}

        {erroreInvio ? <Banner kind="error" message={erroreInvio} /> : null}

        <MessageComposer onInvia={invia} inviando={inviando} disabilitato={chatId === null} />
      </View>

      {accordo !== null && statoDellaScheda === 'daCompilare' ? (
        <AgreementFormModal
          visible={schedaAperta}
          onClose={() => setSchedaAperta(false)}
          accordo={accordo}
          myUsername={myUsername}
          onInvia={inviaScheda}
        />
      ) : null}

      {accordo !== null && statoDellaScheda !== null && statoDellaScheda !== 'daCompilare' ? (
        <ModalShell
          visible={schedaAperta}
          onClose={() => setSchedaAperta(false)}
          titolo="L’accordo"
          descrizione="Le date e il servizio li ha scritti il sistema: qui restano da leggere, e da confermare se tocca a te."
          etichettaChiudi="Chiudi la scheda dell’accordo"
        >
          <AgreementSheet
            titolo={titoloScheda}
            scheda={schedaMostrata}
            azione={statoDellaScheda === 'daConfermare' ? 'conferma' : null}
            onConferma={confermaScheda}
            onRifiuta={statoDellaScheda === 'daConfermare' ? rifiutaScheda : null}
          />
        </ModalShell>
      ) : null}
    </Screen>
  );
}

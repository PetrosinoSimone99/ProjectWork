import { useRef } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { useChat } from '@/hooks/useChat';
import { BackButton } from '@/components/BackButton';
import { Banner } from '@/components/Banner';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { MessageBubble } from '@/components/MessageBubble';
import { MessageComposer } from '@/components/MessageComposer';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { space } from '@/theme/tokens';

/** The header's line when the other person has not written yet. */
const FRASE_GENERICA = 'Messaggi dello scambio: accordatevi qui sui dettagli.';

/**
 * «Chat»: the conversation of one accepted exchange, at
 * `/chat/<agreementId>`.
 *
 * It is a screen and not a panel of the agreement card: a composer anchored to
 * the bottom of the viewport cannot live inside a card of a scrolling tab
 * (brief, decision 1). The entry point is the "Apri chat" action of an
 * `ACCEPTED` row; the route only exists with a session (`app/_layout.jsx`).
 *
 * The subtitle is never invented: the other person's username is read from the
 * messages already on screen, so a chat nobody has written in keeps a generic
 * sentence instead of a name the screen cannot know. A long chat scrolls to the
 * newest message, because that is where the conversation is.
 *
 * States, all explicit: first read (`LoadingScreen`), loaded and empty
 * (`EmptyState`, decision 3 of the brief), read failure (`Banner` + retry,
 * keeping the messages already on screen), failed send (`Banner` above the
 * composer, with the draft kept: the composer clears only on `true`).
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

  return (
    <Screen scroll={false} bottomSpacing={space.sm}>
      <PageHeader
        titolo="Chat"
        frase={controparte === null ? FRASE_GENERICA : `Scambio con @${controparte}`}
        indietro={<BackButton />}
      />

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
    </Screen>
  );
}

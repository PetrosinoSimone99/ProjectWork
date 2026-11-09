import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/auth-context';
import { AgreementCard } from '@/components/AgreementCard';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { useAgreements } from '@/hooks/useAgreements';
import { counterpartOf } from '@/services/agreements';
import { formatIsoDate } from '@/services/dates';
import { space, useTokens } from '@/theme/tokens';

/**
 * The agreements tab, wired to `GET /get-agreements` (decisions 8 and 9).
 *
 * The bell counts the proposals waiting for **me**
 * (`classificati.toAnswer.length`), never an invented number: before the first
 * response, or without the viewer's username, there is no count at all, only
 * the loading or error line. Opening the bell shows the tick/cross rows that
 * answer through `rispondi(id, true|false)`.
 *
 * The three sections — "Proposte inviate", "Accordi in corso", "Conclusi" —
 * come from `classifyAgreements` (pure rules in `@/services/agreements`).
 * Each section draws its own loading, empty and error state, so a section
 * never shows silence where a state belongs. Errors of the list and errors of
 * an action are separate Banners: one says the data did not arrive, the other
 * that the tap did not go through.
 */
const SECTIONS = [
  {
    key: 'sent',
    title: 'Proposte inviate',
    icon: 'paper-plane-outline',
    emptyTitle: 'Nessuna proposta inviata',
    emptyDescription:
      'Le proposte che hai inviato e che aspettano una risposta compaiono qui.',
  },
  {
    key: 'inProgress',
    title: 'Accordi in corso',
    icon: 'time-outline',
    emptyTitle: 'Nessuno scambio in corso',
    emptyDescription:
      'Quando una proposta viene accettata, lo scambio compare qui con i dettagli che il backend ha registrato, se li ha.',
  },
  {
    key: 'concluded',
    title: 'Conclusi',
    icon: 'archive-outline',
    emptyTitle: 'Nessun accordo concluso',
    emptyDescription:
      'Gli accordi rifiutati, annullati o scaduti restano qui; uno scambio accettato e gia scaduto si puo ancora annullare.',
  },
];

/** The shared loading row of the bell panel and of every section. */
function RigaCaricamento({ testo }) {
  const t = useTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm }}>
      <ActivityIndicator size="small" color={t.primary} />
      <AppText variant="small" tone="secondary">
        {testo}
      </AppText>
    </View>
  );
}

/**
 * The bell's accessible name. It replaces the card content for a screen
 * reader, so it has to carry the count the badge shows visually.
 */
function etichettaCampanella(aperto, conteggio) {
  const azione = aperto ? 'Chiudi' : 'Apri';
  if (conteggio === null) {
    return `${azione} le proposte ricevute`;
  }
  if (conteggio === 0) {
    return `${azione} le proposte ricevute: nessuna da rispondere`;
  }
  return `${azione} le proposte ricevute: ${conteggio} da rispondere`;
}

export default function AgreementsScreen() {
  const { token, utente } = useAuth();
  const t = useTokens();
  const myUsername = utente?.username ?? null;
  const [pannelloAperto, setPannelloAperto] = useState(false);

  const {
    classificati,
    caricamento,
    errore,
    rispondi,
    annulla,
    actionError,
    azioneInCorso,
    refreshing,
    onRefresh,
    riprova,
  } = useAgreements({ token, myUsername });

  const occupato = azioneInCorso !== null;

  // The bell number: real proposals only, and nothing at all before the first
  // response or without the viewer's username (a "0" would be an invented
  // count, and without my username no row can be classified as mine).
  const conteggio =
    classificati === null || myUsername === null ? null : classificati.toAnswer.length;

  let didascaliaCampanella;
  if (myUsername === null) {
    didascaliaCampanella = 'Non riesco a leggere il tuo account: ricarica la sessione.';
  } else if (conteggio !== null) {
    didascaliaCampanella =
      conteggio > 0
        ? 'Tocca per vedere le proposte da rispondere.'
        : 'Nessuna proposta da rispondere.';
  } else if (caricamento) {
    didascaliaCampanella = 'Carico le proposte…';
  } else if (errore) {
    didascaliaCampanella = 'Caricamento non riuscito.';
  } else {
    didascaliaCampanella = ''; // no state yet: draw no claim instead of a fake one.
  }

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Accordi</AppText>
        <AppText variant="small" tone="secondary">
          Gli scambi nati da una proposta accettata. Le proposte ricevute si accettano o si
          rifiutano dalla campanella.
        </AppText>
      </View>

      {errore ? (
        <>
          <Banner kind="error" message={errore} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={riprova}
            style={{ alignSelf: 'flex-start' }}
          />
        </>
      ) : null}

      {actionError ? <Banner kind="error" message={actionError} /> : null}

      {/* The bell: pressable, with the real count of proposals to answer. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: pannelloAperto }}
        accessibilityLabel={etichettaCampanella(pannelloAperto, conteggio)}
        onPress={() => setPannelloAperto((aperto) => !aperto)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <CardBell
          conteggio={conteggio}
          didascalia={didascaliaCampanella}
          aperto={pannelloAperto}
        />
      </Pressable>

      {pannelloAperto ? (
        <CardPanel
          classificati={classificati}
          errore={errore}
          myUsername={myUsername}
          occupato={occupato}
          azioneInCorso={azioneInCorso}
          onRispondi={rispondi}
        />
      ) : null}

      {SECTIONS.map((section) => {
        const bucket = classificati === null ? null : classificati[section.key];
        return (
          <View key={section.key} style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name={section.icon} size={18} color={t.textSecondary} />
              <AppText variant="heading">{section.title}</AppText>
            </View>
            {bucket === null ? (
              errore ? (
                <EmptyState
                  variante="non-disponibile"
                  icon={section.icon}
                  title="Caricamento non riuscito"
                  description="Gli accordi di questa sezione non sono arrivati: usa «Riprova» in alto."
                />
              ) : (
                <RigaCaricamento testo="Carico gli accordi…" />
              )
            ) : bucket.length === 0 ? (
              <EmptyState
                icon={section.icon}
                title={section.emptyTitle}
                description={section.emptyDescription}
              />
            ) : (
              bucket.map((accordo) => (
                <AgreementCard
                  key={accordo.id}
                  accordo={accordo}
                  myUsername={myUsername}
                  onCancel={accordo.stato === 'ACCEPTED' ? () => annulla(accordo.id) : null}
                  azioneInCorso={azioneInCorso}
                />
              ))
            )}
          </View>
        );
      })}
    </Screen>
  );
}

/** The bell card itself: icon, title, count badge and the state line. */
function CardBell({ conteggio, didascalia, aperto }) {
  const t = useTokens();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: t.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="notifications-outline" size={20} color={t.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" style={{ fontSize: 16 }}>
            Proposte ricevute
          </AppText>
          {didascalia ? (
            <AppText variant="small" tone="secondary">
              {didascalia}
            </AppText>
          ) : null}
        </View>
        {conteggio !== null && conteggio > 0 ? (
          <View
            style={{
              minWidth: 28,
              height: 28,
              borderRadius: 999,
              paddingHorizontal: space.sm,
              backgroundColor: t.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="small" style={{ color: t.onPrimary, fontWeight: '700' }}>
              {String(conteggio)}
            </AppText>
          </View>
        ) : null}
        <Ionicons
          name={aperto ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={t.textSecondary}
        />
      </View>
    </Card>
  );
}

/** The open bell panel: one row per proposal, with the tick and the cross. */
function CardPanel({
  classificati,
  errore,
  myUsername,
  occupato,
  azioneInCorso,
  onRispondi,
}) {
  let contenuto;
  if (myUsername === null) {
    // Without the viewer's username no proposal can be recognised as mine: a
    // "nothing to answer" here would be a claim about data we cannot read.
    contenuto = (
      <AppText variant="small" tone="secondary">
        Non riesco a leggere il tuo account: ricarica la sessione.
      </AppText>
    );
  } else if (classificati === null) {
    contenuto = errore ? (
      <AppText variant="small" tone="secondary">
        Caricamento non riuscito: usa «Riprova» in alto.
      </AppText>
    ) : (
      <RigaCaricamento testo="Carico le proposte…" />
    );
  } else if (classificati.toAnswer.length === 0) {
    contenuto = (
      <AppText variant="small" tone="secondary">
        Nessuna proposta da rispondere.
      </AppText>
    );
  } else {
    contenuto = classificati.toAnswer.map((accordo) => {
      const controparte = counterpartOf(accordo, myUsername);
      const propostaDel = formatIsoDate(accordo.creazione);
      const miaAzione = azioneInCorso?.id === accordo.id ? azioneInCorso.nome : null;
      return (
        <View
          key={accordo.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            flexWrap: 'wrap',
            paddingVertical: space.xs,
          }}
        >
          <View style={{ flex: 1, minWidth: 150, gap: 2 }}>
            <AppText>{controparte ? `@${controparte}` : 'Controparte non disponibile'}</AppText>
            {propostaDel ? (
              <AppText variant="caption" tone="secondary">
                {`Proposta del ${propostaDel}`}
              </AppText>
            ) : null}
          </View>
          <AppButton
            label="Accetta"
            variant="primary"
            icon="checkmark-outline"
            accessibilityLabel={`Accetta la proposta di ${controparte ? `@${controparte}` : 'questa persona'}`}
            onPress={() => void onRispondi(accordo.id, true)}
            loading={miaAzione === 'accetta'}
            disabled={occupato && miaAzione !== 'accetta'}
            style={{ flex: 1, minWidth: 120 }}
          />
          <AppButton
            label="Rifiuta"
            variant="secondary"
            icon="close-outline"
            accessibilityLabel={`Rifiuta la proposta di ${controparte ? `@${controparte}` : 'questa persona'}`}
            onPress={() => void onRispondi(accordo.id, false)}
            loading={miaAzione === 'rifiuta'}
            disabled={occupato && miaAzione !== 'rifiuta'}
            style={{ flex: 1, minWidth: 120 }}
          />
        </View>
      );
    });
  }

  return (
    <Card style={{ gap: space.sm }}>
      <AppText variant="heading" style={{ fontSize: 16 }}>
        Proposte da rispondere
      </AppText>
      {contenuto}
    </Card>
  );
}

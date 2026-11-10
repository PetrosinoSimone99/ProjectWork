import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
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
import { ombra, radius, space, target, useTokens } from '@/theme/tokens';

/**
 * The agreements tab, wired to `GET /get-agreements` (decisions 8 and 9).
 *
 * Three sections, seen one at a time: `sent` ("Inviate"), `inProgress`
 * ("In corso", accepted but not closed yet) and `concluded`. They are the tabs
 * at the top, drawn as buttons in a row with the real count of each section
 * (an em dash while the data has not arrived); the count is shown as `0` too,
 * because a zero is information and a missing badge looks like a broken load.
 *
 * The bell counts the proposals waiting for **me**
 * (`classificati.toAnswer.length`), never an invented number: before the first
 * response, or without the viewer's username, there is no count at all and the
 * badge is absent. It sits in the bottom-right corner as a floating button and
 * opens its panel **above itself**, so the list never has to grow into the page
 * below. The panel is a `Modal` (not an inline block) because the button floats
 * over the scroll view: an inline block there would be clipped or would scroll
 * away with the page.
 *
 * Each section draws its own loading, empty and error state, so a section never
 * shows silence where a state belongs. Errors of the list and errors of an
 * action are separate Banners: one says the data did not arrive, the other that
 * the tap did not go through.
 */
const SECTIONS = [
  {
    key: 'sent',
    tab: 'Inviate',
    title: 'Proposte inviate',
    description: 'Le proposte che hai inviato e che aspettano una risposta.',
    icon: 'paper-plane-outline',
    emptyTitle: 'Nessuna proposta inviata',
    emptyDescription:
      "Quando invii una proposta, la trovi qui finché l'altra persona non risponde.",
  },
  {
    key: 'inProgress',
    tab: 'In corso',
    title: 'Accordi in corso',
    description: 'Gli scambi accettati che non sono ancora finiti.',
    icon: 'time-outline',
    emptyTitle: 'Nessuno scambio in corso',
    emptyDescription:
      'Quando una proposta viene accettata, lo scambio compare qui con i dettagli che il backend ha registrato, se li ha.',
  },
  {
    key: 'concluded',
    tab: 'Conclusi',
    title: 'Conclusi',
    description: 'Gli accordi rifiutati, annullati o già scaduti.',
    icon: 'archive-outline',
    emptyTitle: 'Nessun accordo concluso',
    emptyDescription:
      'Gli accordi rifiutati, annullati o scaduti restano qui; uno scambio accettato e già scaduto si può ancora annullare.',
  },
];

/** Diameter of the floating bell: above the 44pt minimum touch target. */
const BELL_SIZE = 56;

/** Distance of the bell — and of the panel it opens — from the screen edges. */
const BELL_MARGIN = space.lg;

/** Widest the bell panel gets on a wide screen; on a phone it is edge to edge. */
const BELL_PANEL_MAX_WIDTH = 420;

/** Share of the window height the panel may cover, so the page stays visible. */
const BELL_PANEL_HEIGHT_RATIO = 0.7;

/** Side of the round close button of the bell panel (touch target, in pt). */
const CLOSE_BUTTON_SIZE = target.min;

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
 * The bell's accessible name. It replaces the button content for a screen
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

/** The accessible name of a section tab, count included when the data arrived. */
function tabLabel(sezione, conteggio) {
  if (conteggio === null) {
    return sezione.tab;
  }
  return `${sezione.tab}: ${conteggio === 1 ? '1 accordo' : `${conteggio} accordi`}`;
}

/** The subtitle of the bell panel: the count when it exists, never a fake one. */
function didascaliaPannello({ conteggio, myUsername, caricamento, errore }) {
  if (myUsername === null) {
    return 'Non riesco a leggere il tuo account: ricarica la sessione.';
  }
  if (conteggio === null) {
    if (caricamento) {
      return 'Carico le proposte…';
    }
    return errore ? 'Caricamento non riuscito.' : 'Proposte ricevute.';
  }
  if (conteggio === 0) {
    return 'Nessuna proposta da rispondere.';
  }
  return conteggio === 1 ? '1 proposta da rispondere.' : `${conteggio} proposte da rispondere.`;
}

export default function AgreementsScreen() {
  const { token, utente } = useAuth();
  const t = useTokens();
  const myUsername = utente?.username ?? null;
  const [pannelloAperto, setPannelloAperto] = useState(false);
  const [sezioneAttiva, setSezioneAttiva] = useState(SECTIONS[0].key);

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

  // One count per tab, `null` until the data arrives: the badge then says
  // nothing instead of claiming a zero we have not read.
  const conteggi = {
    sent: classificati === null ? null : classificati.sent.length,
    inProgress: classificati === null ? null : classificati.inProgress.length,
    concluded: classificati === null ? null : classificati.concluded.length,
  };

  const sezione = SECTIONS.find((voce) => voce.key === sezioneAttiva) ?? SECTIONS[0];
  const bucket = classificati === null ? null : classificati[sezione.key];

  return (
    <View style={{ flex: 1 }}>
      <Screen
        scroll
        withBottomInset={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        // The floating bell covers the bottom-right corner: the last row of the
        // list has to end above it, otherwise it can never be tapped.
        bottomSpacing={BELL_SIZE + BELL_MARGIN * 2}
      >
        <View style={{ gap: space.xs }}>
          <AppText variant="title">Accordi</AppText>
          <AppText variant="small" tone="secondary">
            Gli scambi nati da una proposta accettata. Le proposte ricevute si accettano o si
            rifiutano dalla campanella in basso a destra.
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

        <SectionTabs
          sections={SECTIONS}
          activeKey={sezione.key}
          counts={conteggi}
          onChange={setSezioneAttiva}
        />

        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Ionicons name={sezione.icon} size={18} color={t.textSecondary} />
            <AppText variant="heading">{sezione.title}</AppText>
          </View>
          <AppText variant="small" tone="secondary">
            {sezione.description}
          </AppText>

          {bucket === null ? (
            errore ? (
              <EmptyState
                variante="non-disponibile"
                icon={sezione.icon}
                title="Caricamento non riuscito"
                description="Gli accordi di questa sezione non sono arrivati: usa «Riprova» in alto."
              />
            ) : (
              <RigaCaricamento testo="Carico gli accordi…" />
            )
          ) : bucket.length === 0 ? (
            <EmptyState
              icon={sezione.icon}
              title={sezione.emptyTitle}
              description={sezione.emptyDescription}
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
      </Screen>

      <BellButton
        conteggio={conteggio}
        aperto={pannelloAperto}
        onPress={() => setPannelloAperto((aperto) => !aperto)}
      />

      <BellPanel
        visible={pannelloAperto}
        onClose={() => setPannelloAperto(false)}
        didascalia={didascaliaPannello({ conteggio, myUsername, caricamento, errore })}
        classificati={classificati}
        myUsername={myUsername}
        caricamento={caricamento}
        errore={errore}
        occupato={occupato}
        azioneInCorso={azioneInCorso}
        onRispondi={rispondi}
      />
    </View>
  );
}

/**
 * The three sections as buttons in a row: one is selected, each carries the
 * count of its section. A `tablist` with `tab` children, like `PillBar`, so the
 * pattern for a short set of choices is the same across the app.
 */
function SectionTabs({ sections, activeKey, counts, onChange }) {
  const t = useTokens();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Sezioni degli accordi"
      style={{
        flexDirection: 'row',
        gap: space.xs,
        padding: space.xs,
        borderWidth: 1,
        borderColor: t.borderInput,
        borderRadius: radius.pill,
        backgroundColor: t.surface,
      }}
    >
      {sections.map((voce) => {
        const attiva = voce.key === activeKey;
        const conteggio = counts[voce.key] ?? null;
        return (
          <Pressable
            key={voce.key}
            accessibilityRole="tab"
            accessibilityLabel={tabLabel(voce, conteggio)}
            accessibilityState={{ selected: attiva }}
            aria-selected={attiva}
            onPress={() => onChange(voce.key)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: target.min,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.xs,
              paddingHorizontal: space.sm,
              borderRadius: radius.pill,
              backgroundColor: attiva ? t.primary : pressed ? t.border : 'transparent',
            })}
          >
            <AppText
              variant="small"
              style={{ color: attiva ? t.onPrimary : t.text, fontWeight: '600' }}
            >
              {voce.tab}
            </AppText>
            {conteggio !== null ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 5,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: attiva ? t.onPrimary : t.border,
                }}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: attiva ? t.primary : t.textSecondary,
                  }}
                >
                  {String(conteggio)}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The bell as a floating round button in the bottom-right corner, with the
 * count of proposals to answer on the top-right of the circle. The badge pair is
 * `dangerBg`/`dangerText` — a colour combination the theme already validates —
 * with a `danger` border so it still reads against the primary circle.
 */
function BellButton({ conteggio, aperto, onPress }) {
  const t = useTokens();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etichettaCampanella(aperto, conteggio)}
      accessibilityState={{ expanded: aperto }}
      aria-expanded={aperto}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        right: BELL_MARGIN,
        bottom: BELL_MARGIN,
        width: BELL_SIZE,
        height: BELL_SIZE,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.primaryPressed : t.primary,
        shadowColor: ombra,
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      })}
    >
      <Ionicons
        name={aperto ? 'notifications' : 'notifications-outline'}
        size={24}
        color={t.onPrimary}
      />
      {conteggio !== null && conteggio > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -space.xs,
            right: -space.xs,
            minWidth: 22,
            height: 22,
            paddingHorizontal: 5,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: t.danger,
            backgroundColor: t.dangerBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 11, fontWeight: '700', color: t.dangerText }}>
            {String(conteggio)}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * The panel the bell opens: anchored above the button, right-aligned, as wide as
 * the screen allows and never taller than `BELL_PANEL_HEIGHT_RATIO` of the
 * window (the rows scroll inside). Tapping outside closes it; there is also an
 * explicit close button, because on a phone the visible outside area is thin.
 *
 * Loading, empty, missing-account and error are separate branches: the panel
 * never draws rows it has not read, and never draws an invented count.
 */
function BellPanel({
  visible,
  onClose,
  didascalia,
  classificati,
  myUsername,
  caricamento,
  errore,
  occupato,
  azioneInCorso,
  onRispondi,
}) {
  const t = useTokens();
  const { width: larghezzaFinestra, height: altezzaFinestra } = useWindowDimensions();
  const larghezza = Math.min(BELL_PANEL_MAX_WIDTH, larghezzaFinestra - BELL_MARGIN * 2);

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
        Caricamento non riuscito: chiudi il pannello e usa «Riprova».
      </AppText>
    ) : (
      <RigaCaricamento testo="Carico le proposte…" />
    );
  } else if (classificati.toAnswer.length === 0) {
    // The subtitle already says there is nothing to answer: the body explains
    // where a proposal will appear instead of repeating the same sentence.
    contenuto = (
      <AppText variant="small" tone="secondary">
        Quando qualcuno ti propone uno scambio, lo trovi qui da accettare o rifiutare.
      </AppText>
    );
  } else {
    contenuto = classificati.toAnswer.map((accordo, indice) => {
      const controparte = counterpartOf(accordo, myUsername);
      const propostaDel = formatIsoDate(accordo.creazione);
      const miaAzione = azioneInCorso?.id === accordo.id ? azioneInCorso.nome : null;
      const chi = controparte ? `@${controparte}` : 'questa persona';
      return (
        <View
          key={accordo.id}
          style={{
            gap: space.sm,
            paddingTop: indice === 0 ? 0 : space.sm,
            borderTopWidth: indice === 0 ? 0 : 1,
            borderTopColor: t.border,
          }}
        >
          <View style={{ gap: 2 }}>
            <AppText>{controparte ? `@${controparte}` : 'Controparte non disponibile'}</AppText>
            {propostaDel ? (
              <AppText variant="caption" tone="secondary">
                {`Proposta del ${propostaDel}`}
              </AppText>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <AppButton
              label="Accetta"
              variant="primary"
              icon="checkmark-outline"
              accessibilityLabel={`Accetta la proposta di ${chi}`}
              onPress={() => void onRispondi(accordo.id, true)}
              loading={miaAzione === 'accetta'}
              disabled={occupato && miaAzione !== 'accetta'}
              style={{ flex: 1 }}
            />
            <AppButton
              label="Rifiuta"
              variant="secondary"
              icon="close-outline"
              accessibilityLabel={`Rifiuta la proposta di ${chi}`}
              onPress={() => void onRispondi(accordo.id, false)}
              loading={miaAzione === 'rifiuta'}
              disabled={occupato && miaAzione !== 'rifiuta'}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      );
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {/* Tapping outside the panel closes it. The backdrop is not announced:
            the close button carries that name, and two controls saying the same
            thing is noise for a screen reader. */}
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          onPress={onClose}
        />

        <View
          accessibilityViewIsModal
          style={{
            position: 'absolute',
            right: BELL_MARGIN,
            bottom: BELL_MARGIN + BELL_SIZE + space.sm,
            width: larghezza,
            maxHeight: altezzaFinestra * BELL_PANEL_HEIGHT_RATIO,
          }}
        >
          <Card style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading" style={{ fontSize: 16 }}>
                  Proposte ricevute
                </AppText>
                <AppText variant="small" tone="secondary">
                  {didascalia}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chiudi le proposte ricevute"
                onPress={onClose}
                style={({ pressed }) => ({
                  width: CLOSE_BUTTON_SIZE,
                  height: CLOSE_BUTTON_SIZE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.pill,
                  backgroundColor: pressed ? t.border : 'transparent',
                })}
              >
                <Ionicons name="close" size={20} color={t.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: space.sm }}>
              {contenuto}
            </ScrollView>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

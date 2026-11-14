import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { AgreementCard } from '@/components/AgreementCard';
import { AppButton } from '@/components/AppButton';
import { AppIcon } from '@/components/AppIcon';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { ModalShell } from '@/components/ModalShell';
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
 * below. The panel is a `ModalShell` (not an inline block) because the button
 * floats over the scroll view: an inline block there would be clipped or would
 * scroll away with the page.
 *
 * Accepting and refusing are irreversible from the bell, so both go through the
 * `ConfirmModal` used everywhere else for that class of action: one tap on the
 * row would be the only place in the app where a decision that cannot be undone
 * starts without confirmation (audit UX F01).
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
      'Quando una proposta viene accettata, lo scambio compare qui con la scheda dell’accordo e i suoi dettagli.',
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

/** The shared loading row of the bell panel and of every section. */
function RigaCaricamento({ testo }) {
  const t = useTokens();
  return (
    <View
      // Regione viva (audit UX F53): la riga dice che si sta caricando, e chi
      // non vede lo spinner deve sentirselo dire.
      accessibilityLiveRegion="polite"
      aria-live="polite"
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm }}
    >
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
function didascaliaPannello({ conteggio, myUsername, caricamento }) {
  if (myUsername === null) {
    return 'Non riesco a leggere il tuo account: ricarica la sessione.';
  }
  if (conteggio === null) {
    if (caricamento) {
      return 'Carico le proposte…';
    }
    // L'errore non si dice due volte: il corpo del pannello porta il Banner con
    // «Riprova» dentro, qui resta il fatto che il pannello riguarda le proposte.
    return 'Proposte ricevute.';
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
    esito,
    congedaEsito,
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
          <AppText variant="title" level={1}>
            Accordi
          </AppText>
          <AppText variant="small" tone="secondary">
            Gli scambi nati da una proposta accettata. Le proposte ricevute si accettano o si
            rifiutano dalla campanella in basso a destra.
          </AppText>
        </View>

        {errore ? (
          // Il messaggio e il suo ritentativo sono un elemento solo: prima erano
          // un banner e un bottone separati, con lo stesso fatto detto due volte.
          <Banner
            kind="error"
            message={errore}
            etichettaAzione="Riprova"
            onAzione={riprova}
            caricamentoAzione={caricamento}
          />
        ) : null}

        {actionError ? <Banner kind="error" message={actionError} /> : null}

        {esito ? (
          <Banner
            kind="success"
            message={esito}
            etichettaAzione="Ho capito"
            iconaAzione="checkmark-outline"
            onAzione={congedaEsito}
          />
        ) : null}

        <SectionTabs
          sections={SECTIONS}
          activeKey={sezione.key}
          counts={conteggi}
          onChange={setSezioneAttiva}
        />

        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <AppIcon name={sezione.icon} size={18} color={t.textSecondary} />
            <AppText variant="heading">{sezione.title}</AppText>
          </View>
          <AppText variant="small" tone="secondary">
            {sezione.description}
          </AppText>

          {bucket === null ? (
            errore ? (
              <EmptyState
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
        didascalia={didascaliaPannello({ conteggio, myUsername, caricamento })}
        classificati={classificati}
        myUsername={myUsername}
        errore={errore}
        occupato={occupato}
        azioneInCorso={azioneInCorso}
        onRispondi={rispondi}
        onRiprova={riprova}
      />
    </View>
  );
}

/**
 * The three sections as pills in one track: one is selected, each carries the
 * count of its section.
 *
 * A `radiogroup` with `radio` children (audit F55), not a `tablist`: the three
 * sections are mutually exclusive views of one list, and a tablist would promise
 * a `tabpanel` per tab that does not exist. Same pattern as `ThemeSelector` and
 * `PillBar`, and the state rides both channels — `accessibilityState.checked`
 * for native, `aria-checked` for web — because `react-native-web` reads only the
 * `aria-*` ones.
 */
function SectionTabs({ sections, activeKey, counts, onChange }) {
  const t = useTokens();

  return (
    <View
      accessibilityRole="radiogroup"
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
            accessibilityRole="radio"
            accessibilityLabel={tabLabel(voce, conteggio)}
            accessibilityState={{ checked: attiva }}
            aria-checked={attiva}
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
                  // minHeight e non height: al 200% il numero non deve tagliarsi
                  // (audit UX F23).
                  minHeight: 20,
                  paddingHorizontal: space.xs,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: attiva ? t.onPrimary : t.border,
                }}
              >
                <AppText
                  variant="small"
                  style={{
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
      <AppIcon
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
            // minHeight: il badge non taglia il numero al 200% (audit UX F23).
            minHeight: 22,
            paddingHorizontal: space.xs,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: t.danger,
            backgroundColor: t.dangerBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="small" style={{ fontWeight: '700', color: t.dangerText }}>
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
 * window (the rows scroll inside). It is a `ModalShell`, so it closes with the
 * X, with Escape on the web and with a tap outside, and the focus moves into the
 * panel when it opens (audit UX F15, F16).
 *
 * Loading, empty, missing-account and error are separate branches: the panel
 * never draws rows it has not read, and never draws an invented count. The error
 * branch carries its own «Riprova»: asking the user to close the panel and find
 * the button somewhere else cost three steps (F12).
 *
 * Accepting and refusing open the `ConfirmModal` first: the copy names the other
 * person and what the choice does, because neither action can be undone from
 * here (F01).
 */
function BellPanel({
  visible,
  onClose,
  didascalia,
  classificati,
  myUsername,
  errore,
  occupato,
  azioneInCorso,
  onRispondi,
  onRiprova,
}) {
  const t = useTokens();
  const { width: larghezzaFinestra, height: altezzaFinestra } = useWindowDimensions();
  const larghezza = Math.min(BELL_PANEL_MAX_WIDTH, larghezzaFinestra - BELL_MARGIN * 2);
  // La decisione in attesa di conferma: `null` quando non c'è niente da chiedere.
  const [daConfermare, setDaConfermare] = useState(null);

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
      <Banner
        kind="error"
        message={errore}
        etichettaAzione="Riprova"
        onAzione={onRiprova}
      />
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
          <View style={{ gap: space.xs }}>
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
              onPress={() => setDaConfermare({ id: accordo.id, chi, accepted: true })}
              loading={miaAzione === 'accetta'}
              disabled={occupato && miaAzione !== 'accetta'}
              style={{ flex: 1 }}
            />
            <AppButton
              label="Rifiuta"
              variant="secondary"
              icon="close-outline"
              accessibilityLabel={`Rifiuta la proposta di ${chi}`}
              onPress={() => setDaConfermare({ id: accordo.id, chi, accepted: false })}
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
    <>
      <ModalShell
        visible={visible}
        onClose={onClose}
        titolo="Proposte ricevute"
        descrizione={didascalia}
        etichettaChiudi="Chiudi le proposte ricevute"
        align="bottom"
        larghezzaMassima={larghezza}
        contenitoreStyle={{
          alignItems: 'flex-end',
          paddingRight: BELL_MARGIN,
          paddingBottom: BELL_MARGIN + BELL_SIZE + space.sm,
          paddingLeft: BELL_MARGIN,
        }}
        pannelloStyle={{ maxHeight: altezzaFinestra * BELL_PANEL_HEIGHT_RATIO }}
      >
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: space.sm }}>
          {contenuto}
        </ScrollView>
      </ModalShell>

      {/* La conferma vive accanto al pannello, non dentro: è un secondo dialogo
          sopra il primo, come ovunque nell'app. */}
      <ConfirmModal
        visible={daConfermare !== null}
        titolo={
          daConfermare?.accepted ? 'Accettare questa proposta?' : 'Rifiutare questa proposta?'
        }
        messaggio={
          daConfermare?.accepted
            ? `Accettando, lo scambio con ${daConfermare?.chi} diventa un accordo in corso: da qui non puoi più cambiare risposta.`
            : `Rifiutando, la proposta di ${daConfermare?.chi} si chiude: non puoi rispondere di nuovo.`
        }
        etichettaConferma={daConfermare?.accepted ? 'Accetta la proposta' : 'Rifiuta la proposta'}
        varianteConferma={daConfermare?.accepted ? 'primary' : 'danger'}
        onConferma={() => {
          const scelta = daConfermare;
          setDaConfermare(null);
          if (scelta) {
            void onRispondi(scelta.id, scelta.accepted);
          }
        }}
        onAnnulla={() => setDaConfermare(null)}
      />
    </>
  );
}

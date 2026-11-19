import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '@/api/client';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { BarterPair } from './BarterPair';
import { ConfirmModal } from './ConfirmModal';
import { formatIsoDateTimeNumeric } from '@/services/dates';
import { isSheetCompiled } from '@/services/agreements';
import { radius, space, useTokens } from '@/theme/tokens';

/** The line the sheet prints where a timestamp has not been written yet. */
const NON_ANCORA = '—';

const ERRORE_CONFERMA = 'Non è stato possibile confermare la scheda. Riprova.';
const ERRORE_RIFIUTO = 'Non è stato possibile rifiutare la scheda. Riprova.';

/** Il tipo di servizio della riga, con le parole del prodotto. */
const TIPI_SERVIZIO = { OFFER: 'Offerta', REQUEST: 'Ricerca' };

/**
 * The delivery sheet as the reader meets it once it has left the form: two
 * timestamps the backend wrote, the sender's own service, the free description
 * the sender typed, and — for the recipient — the two decisions that are left.
 *
 * Everything on the sheet belongs to one participant's row: `inizio` is the
 * moment the proposal was accepted, `fine` is written when the recipient
 * confirms, `tipoServizio`/`descrizione` come from the sender's published
 * service, `note` is the only field a person writes (`send-agreement-details`
 * takes `{agreementId, notes}` and nothing else). Both timestamps are shown
 * `GG/MM/AAAA HH:MM` as read-only facts; a missing `fine` prints `—` instead of
 * a date nobody wrote.
 *
 * `azione` decides the only interactive shape left:
 *
 * - `conferma`: the row the viewer has to confirm, behind a `ConfirmModal`
 *   (confirmation writes the end date and closes the exchange) with the refusal
 *   next to it — the first sender locked the round, so accepting or refusing is
 *   all that is left, and the refusal ends the exchange;
 * - `null`: read-only, for the viewer's own sent sheet and for a row whose
 *   action belongs to the other person or to a later moment.
 *
 * A sheet that does not exist draws nothing at all: an empty card would claim a
 * step that has not happened. Errors stay on the component and never reach a
 * banner: the row is what the reader acted on.
 */
export function AgreementSheet({
  titolo,
  scheda,
  direzioni = null,
  azione = null,
  onConferma = null,
  onRifiuta = null,
  occupata = false,
}) {
  const t = useTokens();
  const [errore, setErrore] = useState(null);
  const [inVolo, setInVolo] = useState(false);
  const [confermaAperta, setConfermaAperta] = useState(false);
  const [rifiutoAperto, setRifiutoAperto] = useState(false);

  if (!scheda) {
    return null;
  }

  const compilata = isSheetCompiled(scheda);
  const tipo = TIPI_SERVIZIO[scheda.tipoServizio] ?? null;

  async function esegui(chiudi, call, messaggioGenerico) {
    chiudi(false);
    if (inVolo || occupata) {
      return;
    }
    setErrore(null);
    setInVolo(true);
    try {
      await call();
    } catch (err) {
      setErrore(err instanceof ApiError ? err.message : messaggioGenerico);
    } finally {
      setInVolo(false);
    }
  }

  return (
    <View
      style={{
        gap: space.xs,
        padding: space.md,
        borderRadius: radius.input,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.background,
      }}
    >
      {titolo ? (
        <AppText variant="small" style={{ fontWeight: '600' }}>
          {titolo}
        </AppText>
      ) : null}

      {/* Il baratto prima dei fatti: la decisione che il pannello chiede è
          «confermo questo scambio», quindi lo scambio deve essere sullo schermo
          (audit 2026-11-18, P1-4). Senza i due lati non si disegna nulla. */}
      <BarterPair direzioni={direzioni} />

      <View style={{ gap: space.xs }}>
        <RigaFatto etichetta="Inizio" valore={formatIsoDateTimeNumeric(scheda.inizio) ?? NON_ANCORA} />
        <RigaFatto etichetta="Fine" valore={formatIsoDateTimeNumeric(scheda.fine) ?? NON_ANCORA} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.xs }}>
        <AppIcon name="grid-outline" size={14} color={t.textSecondary} style={{ flexShrink: 0 }} />
        <AppText variant="small" style={{ flexShrink: 1, minWidth: 0 }}>
          {tipo === null ? scheda.descrizione : `${tipo}: ${scheda.descrizione}`}
        </AppText>
      </View>

      {scheda.note !== null ? (
        <View style={{ gap: space.xs }}>
          <AppText variant="small" tone="secondary">
            Descrizione
          </AppText>
          <AppText variant="small">{scheda.note}</AppText>
        </View>
      ) : null}

      {azione === 'conferma' ? (
        <>
          <AppText variant="small" tone="secondary">
            Confermando, lo scambio si chiude alle date indicate e non si può ritirare.
          </AppText>
          {errore ? (
            <AppText variant="label" tone="danger">
              {errore}
            </AppText>
          ) : null}
          <AppButton
            label={inVolo ? 'Confermo…' : 'Conferma la scheda'}
            icon="checkmark-outline"
            onPress={() => setConfermaAperta(true)}
            disabled={inVolo || occupata}
          />
          {onRifiuta !== null ? (
            <AppButton
              label="Rifiuta la scheda"
              variant="danger"
              icon="close-circle-outline"
              onPress={() => setRifiutoAperto(true)}
              disabled={inVolo || occupata}
            />
          ) : null}
        </>
      ) : (
        <View style={{ gap: space.xs }}>
          {compilata ? null : (
            <AppText variant="small" tone="secondary">
              Scheda di consegna non ancora compilata.
            </AppText>
          )}
          {scheda.beneficiarioAccettato === true ? (
            <AppText variant="small" tone="secondary">
              Scheda di consegna confermata.
            </AppText>
          ) : null}
        </View>
      )}

      <ConfirmModal
        visible={confermaAperta}
        titolo="Confermare questa scheda?"
        messaggio={messaggioConferma(direzioni)}
        // Lo stesso verbo del bottone che ha aperto il pannello: la conferma
        // dice l'atto, non «Conferma» (WCAG 3.2.4).
        etichettaConferma="Conferma la scheda"
        varianteConferma="primary"
        loading={inVolo}
        onConferma={() => void esegui(setConfermaAperta, onConferma, ERRORE_CONFERMA)}
        onAnnulla={() => setConfermaAperta(false)}
      />

      {onRifiuta !== null ? (
        <ConfirmModal
          visible={rifiutoAperto}
          titolo="Rifiutare questa scheda?"
          messaggio="Rifiutando, lo scambio si chiude e risulta annullato: non puoi inviare una scheda tua."
          etichettaConferma="Rifiuta la scheda"
          loading={inVolo}
          onConferma={() => void esegui(setRifiutoAperto, onRifiuta, ERRORE_RIFIUTO)}
          onAnnulla={() => setRifiutoAperto(false)}
        />
      ) : null}
    </View>
  );
}

/**
 * La conferma nomina lo scambio, non solo le persone: quando i due lati sono
 * noti dice chi dà cosa a chi, then that it is final. A missing side falls back
 * to the plain sentence — the confirm never invents a service (audit P1-4).
 */
function messaggioConferma(direzioni) {
  const offre = direzioni?.offre ?? null;
  const riceve = direzioni?.riceve ?? null;
  if (offre?.cosa && riceve?.cosa) {
    return `Confermando, ${offre.chi} dà «${offre.cosa}» e ${riceve.chi} dà «${riceve.cosa}». La conferma è definitiva.`;
  }
  return 'La conferma è definitiva: non si può ritirare.';
}

/** One read-only fact of the sheet: the label, then the value beside it. */
function RigaFatto({ etichetta, valore }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <AppText variant="small" tone="secondary">
        {`${etichetta}:`}
      </AppText>
      <AppText variant="small" style={{ flexShrink: 1, minWidth: 0 }}>
        {valore}
      </AppText>
    </View>
  );
}

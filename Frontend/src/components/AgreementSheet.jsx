import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '@/api/client';
import { AppButton } from './AppButton';
import { AppCheckbox } from './AppCheckbox';
import { AppIcon } from './AppIcon';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { ConfirmModal } from './ConfirmModal';
import { formatIsoDate } from '@/services/dates';
import { dataDaInput, isSheetCompiled, periodoValido } from '@/services/agreements';
import { etichettaModalita } from '@/services/offer-request';
import { radius, space, useTokens } from '@/theme/tokens';

/** The date fields have no picker: this is the only format accepted. */
const FORMATO = 'AAAA-MM-GG';
const LUNGHEZZA_DATA = 10;

const ERRORE_DATE = `Scrivi le due date come ${FORMATO}, con la fine dopo l'inizio.`;
const ERRORE_GENERICO = 'Non è stato possibile inviare la scheda. Riprova.';
const ERRORE_CONFERMA = 'Non è stato possibile confermare la scheda. Riprova.';

/**
 * One of the two delivery-sheet rows of an agreement: the one I fill and the
 * one I confirm.
 *
 * The backend creates one row per participant when a proposal is accepted
 * (`createBlankDetails` on both sides), and each row names who fills it
 * (`username`) and who confirms it (`beneficiario`), so the card can hand each
 * row the action it actually accepts — no participant id is guessed anywhere
 * here (`docs/backend-gaps.md` G6).
 *
 * Three shapes, decided by the caller (`azione`):
 *
 * - `compila`: the form. Two date fields, a remote checkbox, and the same rule
 *   the backend enforces (the end must come after the start) checked before
 *   the call, so a typo does not cost a round trip. The dates travel as
 *   `YYYY-MM-DD`: `send-agreement-details` parses them, and inventing a time or
 *   a timezone would be a datum the reader did not type.
 * - `conferma`: the other side's row, read-only, with the confirmation behind a
 *   `ConfirmModal` (it is final: the route answers `500` on a second attempt).
 * - `null`: read-only, for a row whose action belongs to the other person or to
 *   a later moment.
 *
 * Errors stay on the component and never reach a banner: the row is what the
 * reader acted on. A success is shown by the screen reloading the list, which
 * turns the form into the compiled row.
 */
export function AgreementSheet({
  titolo,
  scheda,
  azione = null,
  onInvia = null,
  onConferma = null,
  occupata = false,
  onInVolo = null,
}) {
  const t = useTokens();
  const [inizio, setInizio] = useState(formatIsoDate(scheda?.inizio) ? scheda.inizio.slice(0, 10) : '');
  const [fine, setFine] = useState(formatIsoDate(scheda?.fine) ? scheda.fine.slice(0, 10) : '');
  const [daRemoto, setDaRemoto] = useState(scheda?.daRemoto === true);
  const [errore, setErrore] = useState(null);
  const [inVolo, setInVolo] = useState(false);
  const [confermaAperta, setConfermaAperta] = useState(false);

  if (!scheda) {
    return null;
  }

  const compilata = isSheetCompiled(scheda);

  async function invia() {
    if (inVolo || occupata) {
      return;
    }
    if (!periodoValido(inizio, fine)) {
      setErrore(ERRORE_DATE);
      return;
    }
    setErrore(null);
    setInVolo(true);
    onInVolo?.(true);
    try {
      await onInvia({ fromRemote: daRemoto, startDate: dataDaInput(inizio), endDate: dataDaInput(fine) });
    } catch (err) {
      setErrore(err instanceof ApiError ? err.message : ERRORE_GENERICO);
    } finally {
      setInVolo(false);
      onInVolo?.(false);
    }
  }

  async function conferma() {
    setConfermaAperta(false);
    if (inVolo || occupata) {
      return;
    }
    setErrore(null);
    setInVolo(true);
    onInVolo?.(true);
    try {
      await onConferma();
    } catch (err) {
      setErrore(err instanceof ApiError ? err.message : ERRORE_CONFERMA);
    } finally {
      setInVolo(false);
      onInVolo?.(false);
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
      <AppText variant="small" style={{ fontWeight: '600' }}>
        {titolo}
      </AppText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <AppIcon name="grid-outline" size={14} color={t.textSecondary} />
        <AppText variant="small">{scheda.descrizione}</AppText>
      </View>

      {azione === 'compila' ? (
        <View style={{ gap: space.sm }}>
          <AppInput
            label="Inizio"
            value={inizio}
            onChangeText={setInizio}
            placeholder={FORMATO}
            maxLength={LUNGHEZZA_DATA}
            editable={!inVolo}
          />
          <AppInput
            label="Fine"
            value={fine}
            onChangeText={setFine}
            placeholder={FORMATO}
            maxLength={LUNGHEZZA_DATA}
            editable={!inVolo}
          />
          <AppCheckbox label="Si svolge da remoto" value={daRemoto} onChange={setDaRemoto} disabled={inVolo} />
          {errore ? (
            <AppText variant="label" tone="danger">
              {errore}
            </AppText>
          ) : null}
          <AppButton
            label={inVolo ? 'Invio…' : 'Invia la scheda'}
            icon="document-text-outline"
            onPress={() => void invia()}
            disabled={inVolo || occupata}
          />
        </View>
      ) : (
        <View style={{ gap: space.xs }}>
          {compilata ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <AppIcon
                  name={scheda.daRemoto === true ? 'videocam-outline' : 'people-outline'}
                  size={14}
                  color={t.textSecondary}
                />
                <AppText variant="small" tone="secondary">
                  {`Si svolge ${etichettaModalita(scheda.daRemoto === true)}`}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <AppIcon name="calendar-outline" size={14} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {descriviPeriodo(scheda.fine)}
                </AppText>
              </View>
              {/* Only the end date is shown on purpose: the schema resets
                  `start_date` on every update, so the start the reader set is
                  not what the API returns (backend-gaps.md G20). Claiming it
                  would show a date nobody chose. */}
              <AppText variant="small" tone="secondary">
                L&apos;inizio non è disponibile: il server non lo conserva (limite noto).
              </AppText>
            </>
          ) : (
            <AppText variant="small" tone="secondary">
              Scheda non ancora compilata.
            </AppText>
          )}

          {azione === 'conferma' ? (
            <>
              <AppText variant="small" tone="secondary">
                Confermando, l&apos;altra persona può dare lo scambio per concluso alle date indicate.
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
              <ConfirmModal
                visible={confermaAperta}
                titolo="Confermare questa scheda?"
                messaggio="La conferma è definitiva: non si può ritirare."
                etichettaConferma="Conferma"
                loading={inVolo}
                onConferma={() => void conferma()}
                onAnnulla={() => setConfermaAperta(false)}
              />
            </>
          ) : null}

          {scheda.beneficiarioAccettato === true ? (
            <AppText variant="small" tone="secondary">
              Scheda confermata.
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
}

/**
 * "Fino al 5 dic 2026", or "Date non indicate".
 *
 * The wire timestamp is UTC midnight for a date-only value, so it is read at
 * noon UTC: formatting it directly would show the previous day on any device
 * west of UTC (`services/dates.js` uses the device timezone).
 */
function descriviPeriodo(fine) {
  const giorno = typeof fine === 'string' ? fine.slice(0, 10) : '';
  const formattata = /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? formatIsoDate(`${giorno}T12:00:00Z`) : null;
  return formattata ? `Fino al ${formattata}` : 'Date non indicate';
}

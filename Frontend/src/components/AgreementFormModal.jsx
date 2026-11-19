import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '@/api/client';
import { consumaBozza, leggiBozza, salvaBozza } from '@/auth/auth-context';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { ModalShell } from './ModalShell';
import { formatIsoDateTimeNumeric } from '@/services/dates';
import { sheetsFor } from '@/services/agreements';
import { space, useTokens } from '@/theme/tokens';

/** The cap `send-agreement-details` enforces on `notes` (1..500). */
export const NOTE_MAX_LENGTH = 500;

/** The line the sheet prints where a timestamp has not been written yet. */
const NON_ANCORA = '—';

const NOTE_OBBLIGATORIA = 'Scrivi la descrizione della scheda: da 1 a 500 caratteri.';
const ERRORE_GENERICO = 'Non è stato possibile inviare la scheda. Riprova.';

/** Il tipo di servizio della riga, con le parole del prodotto. */
const TIPI_SERVIZIO = { OFFER: 'Offerta', REQUEST: 'Ricerca' };

/**
 * La chiave della bozza: una per accordo, perché due scambi aperti insieme non
 * devono scambiarsi il testo.
 */
export function chiaveBozzaAccordo(agreementId) {
  return `accordo:${agreementId}`;
}

/**
 * The panel where a participant writes the delivery sheet of their accepted
 * exchange, opened from the chat.
 *
 * It holds four things and nothing else, in this order: `inizio`, `fine`, the
 * service the sender already published, and the one field the person writes.
 * The first two are read-only facts the backend wrote — the moment the proposal
 * was accepted and the moment the sheet is confirmed — printed `GG/MM/AAAA
 * HH:MM`, with `—` where `fine` does not exist yet. The service comes from the
 * sender's own published entry (`tipoServizio` + `descrizione`), so the sheet
 * cannot contradict what that account offers.
 *
 * `Descrizione` is the only input: 1..500 characters, required, and the whole
 * body of `send-agreement-details` together with the agreement id. There is no
 * date picker and no "si svolge da remoto" checkbox any more: both facts belong
 * to the backend and to the sender's service, and asking for them again let the
 * sheet disagree with the rest of the product.
 *
 * Errors stay on the component — the field carries the message, never a banner
 * somewhere else on the screen — and the panel closes only after `onInvia`
 * resolves, so a rejected send leaves the typed description in place.
 *
 * Data and callbacks only: no network, no router, no mutation of the input.
 *
 * Il testo scritto qui non muore con la sessione (audit 2026-11-18, P1-1): ogni
 * cambio lo salva nella bozza della rotta e al montaggio la descrizione riparte
 * da lì. Una `401` a metà lavoro rimanda al login e riporta sulla chat, dove il
 * pannello si riapre con quello che la persona aveva scritto. La bozza si
 * consuma solo quando la scheda parte davvero.
 */
export function AgreementFormModal({
  visible,
  onClose,
  accordo,
  myUsername = null,
  onInvia,
}) {
  const t = useTokens();
  const chiaveBozza = chiaveBozzaAccordo(accordo?.id);
  const [note, setNote] = useState(() => leggiBozza(chiaveBozza) ?? '');
  const [errore, setErrore] = useState(null);
  const [inVolo, setInVolo] = useState(false);

  const { mia } = sheetsFor(accordo, myUsername);
  const tipo = TIPI_SERVIZIO[mia?.tipoServizio] ?? null;
  const fatti = [
    { etichetta: 'Inizio', valore: formatIsoDateTimeNumeric(mia?.inizio) ?? NON_ANCORA },
    { etichetta: 'Fine', valore: formatIsoDateTimeNumeric(mia?.fine) ?? NON_ANCORA },
  ];

  async function salva() {
    if (inVolo) {
      return;
    }
    const testo = note.trim();
    if (testo === '') {
      setErrore(NOTE_OBBLIGATORIA);
      return;
    }
    if (testo.length > NOTE_MAX_LENGTH) {
      setErrore(`La descrizione può avere al massimo ${NOTE_MAX_LENGTH} caratteri.`);
      return;
    }
    setErrore(null);
    setInVolo(true);
    try {
      await onInvia({ agreementId: accordo.id, notes: testo });
      consumaBozza(chiaveBozza);
      setNote('');
      onClose();
    } catch (err) {
      setErrore(err instanceof ApiError ? err.message : ERRORE_GENERICO);
    } finally {
      setInVolo(false);
    }
  }

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      titolo="Scheda di consegna"
      descrizione="Le date e il servizio sono già scritti: aggiungi i dettagli pratici dello scambio."
      etichettaChiudi="Chiudi la scheda di consegna"
      chiudibile={!inVolo}
      footer={
        <AppButton
          label={inVolo ? 'Invio…' : 'Invia la scheda'}
          icon="document-text-outline"
          onPress={() => void salva()}
          disabled={inVolo}
        />
      }
    >
      <View style={{ gap: space.xs }}>
        {fatti.map((fatto) => (
          <View
            key={fatto.etichetta}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}
          >
            <AppText variant="small" tone="secondary">
              {`${fatto.etichetta}:`}
            </AppText>
            <AppText variant="small">{fatto.valore}</AppText>
          </View>
        ))}
      </View>

      {mia?.descrizione ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <AppIcon name="grid-outline" size={14} color={t.textSecondary} />
          <AppText variant="small">
            {tipo === null ? mia.descrizione : `${tipo}: ${mia.descrizione}`}
          </AppText>
        </View>
      ) : (
        <AppText variant="small" tone="secondary">
          Il servizio non è disponibile: la scheda riporterà solo la descrizione che scrivi qui.
        </AppText>
      )}

      <AppInput
        label="Descrizione"
        value={note}
        onChangeText={(testo) => {
          setNote(testo);
          salvaBozza(chiaveBozza, testo);
        }}
        multiline
        maxLength={NOTE_MAX_LENGTH}
        contatore={`${note.length}/${NOTE_MAX_LENGTH}`}
        placeholder="Dove e come avviene lo scambio, cosa portare, a chi scrivere."
        editable={!inVolo}
        error={errore}
      />
    </ModalShell>
  );
}

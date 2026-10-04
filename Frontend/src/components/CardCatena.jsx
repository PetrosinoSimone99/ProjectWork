import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { ElencoMembri } from './ElencoMembri';
import { ModalConferma } from './ModalConferma';
import { nomePersona } from '@/servizi/offerta-ricerca';
import { useTempoResiduo } from '@/hooks/useTempoResiduo';
import {
  NOTA_SERVIZI_IMPEGNATI,
  VISTE,
  descriviCatena,
  etichettaStatoCatena,
  partecipantiInOrdine,
  testoScadenza,
  tonoStatoCatena,
} from '@/servizi/catene';
import { space, useTokens } from '@/theme/tokens';

/**
 * La card di una catena **attiva** (ricerca, conferme, confermate, stati
 * ignoti): chip dello stato (etichetta, o il valore grezzo se ignoto), riga del
 * ruolo («Aperta da te» / «Aperta da …»), scadenze quando il backend le manda,
 * nota sui servizi impegnati, l'elenco dei partecipanti con le loro decisioni e
 * le azioni della fase. Lo storico (concluse e saltate) sta in
 * `CardCatenaConclusa`, non qui.
 *
 * Una sola regola per le azioni (vincolo 4 del piano): **ognuno agisce solo
 * sulle proprie mosse**. In `IN_CONFERME` i pulsanti Accetta/Rifiuta compaiono
 * solo se **io** non ho ancora deciso (`decisione` null); dopo la mia decisione
 * resta la riga «Hai accettato / hai rifiutato», e le decisioni altrui si
 * leggono come chip nell'elenco.
 *
 * Il modale di annullamento chiede **solo il motivo** (obbligatorio, 1–255):
 * l'autore arriva dal JWT, non si chiede mai chi agisce.
 *
 * La scadenza è un dato: quando il residuo tocca lo zero la card chiama
 * `onTempoScaduto` (una rilettura per scadenza, gestita dall'hook) e non
 * dichiara nessun esito. La regione viva è questa card, con `descriviCatena`.
 */

/**
 * Il conto alla rovescia della card, con la **una** rilettura a zero: gancio
 * che colloca `useTempoResiduo` dentro la card (ogni scadenza è per-card) e
 * chiama `onTempoScaduto` quando `scaduto` si accende — il «una volta sola per
 * scadenza» vero lo garantisce l'hook con il suo set di scadenze già chieste.
 */
function useTempoResiduoCatena(scadenzaMs, onTempoScaduto) {
  const tempo = useTempoResiduo(scadenzaMs);
  useEffect(() => {
    if (tempo.scaduto) {
      onTempoScaduto(scadenzaMs);
    }
  }, [tempo.scaduto, scadenzaMs, onTempoScaduto]);
  return tempo;
}

export function CardCatena({ catena, azioneInCorso, onDecidi, onAnnulla, onTempoScaduto }) {
  const t = useTokens();
  const [confermaAnnullamento, setConfermaAnnullamento] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erroreMotivo, setErroreMotivo] = useState(null);

  // La scadenza rilevante della fase: ricerca, conferme, oppure nessuna
  // (CONFERMATA non ha scadenze automatiche — non compaiono conti alla rovescia).
  const vista = catena?.vista ?? null;
  const scadenzaMs =
    vista === VISTE.CATENA.IN_RICERCA
      ? catena?.scadenzaRicercaMs ?? null
      : vista === VISTE.CATENA.IN_CONFERME
        ? catena?.scadenzaConfermeMs ?? null
        : null;
  const scadenzaIso =
    vista === VISTE.CATENA.IN_RICERCA
      ? catena?.scadenzaRicerca ?? null
      : vista === VISTE.CATENA.IN_CONFERME
        ? catena?.scadenzaConferme ?? null
        : null;
  const tempo = useTempoResiduoCatena(scadenzaMs, onTempoScaduto);

  if (!catena) {
    return null;
  }

  const tono = tonoStatoCatena(catena.stato);
  const colori =
    tono === 'service'
      ? { background: t.serviceBg, testo: t.serviceText }
      : { background: t.background, testo: t.textSecondary };
  const etichetta = etichettaStatoCatena(catena.stato) ?? 'Stato sconosciuto';

  const miaDecisione = partecipantiInOrdine(catena.partecipanti).find(
    (partecipante) => partecipante.sonoIo,
  )?.decisione;
  const possoDecidere = vista === VISTE.CATENA.IN_CONFERME && !miaDecisione;
  const azioneDiQuestaCatena =
    azioneInCorso?.idCatena === catena.id ? azioneInCorso : null;
  const annullamentoInCorso = azioneDiQuestaCatena?.tipo === 'annulla';
  const motivoValido = motivo.trim().length >= 1 && motivo.trim().length <= 255;

  function cambiaMotivo(testo) {
    setMotivo(testo);
    if (erroreMotivo && testo.trim().length >= 1 && testo.trim().length <= 255) {
      setErroreMotivo(null);
    }
  }

  function confermaAnnullamentoConMotivo() {
    if (!motivoValido) {
      setErroreMotivo('Scrivi un motivo di 1–255 caratteri.');
      return;
    }
    onAnnulla(catena.id, motivo);
  }

  return (
    <Card accessibilityLiveRegion="polite" accessibilityLabel={descriviCatena(catena)}>
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          <Chip background={colori.background}>
            <AppText variant="caption" style={{ color: colori.testo }}>
              {etichetta}
            </AppText>
          </Chip>
          <AppText variant="small" tone="secondary">
            {catena.sonoInitiator ? 'Aperta da te' : `Aperta da ${nomePersona(catena.apertaDa)}`}
          </AppText>
        </View>

        {/* Uno stato che questa versione non conosce si dichiara, non si traduce. */}
        {vista === VISTE.CATENA.NEUTRA ? (
          <AppText variant="small" tone="secondary">
            Il sistema ha comunicato uno stato che questa versione dell'app non conosce: qui c'è
            quello che sappiamo, senza tirare a indovinare un esito.
          </AppText>
        ) : null}

        {scadenzaMs !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Ionicons name="time-outline" size={15} color={t.textSecondary} />
            <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
              {testoScadenza(tempo, scadenzaMs, scadenzaIso)}
            </AppText>
          </View>
        ) : null}

        {/* Le riserve (vincolo 6 del piano): l'utente lo sa prima di imbattersi nel blocco. */}
        {vista === VISTE.CATENA.IN_CONFERME || vista === VISTE.CATENA.CONFERMATA ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.xs }}>
            <Ionicons
              name="lock-closed-outline"
              size={15}
              color={t.textSecondary}
              style={{ marginTop: 2 }}
            />
            <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
              {NOTA_SERVIZI_IMPEGNATI}
            </AppText>
          </View>
        ) : null}

        {/* In ricerca, prima che il ciclo sia proposto, i partecipanti non ci sono:
            si dice a schermo invece di mostrare un elenco vuoto senza senso. */}
        {vista === VISTE.CATENA.IN_RICERCA ? (
          <AppText variant="small" tone="secondary">
            Sto cercando le persone: qui compaiono man mano, con i nomi. Serve solo aspettare.
          </AppText>
        ) : (
          <ElencoMembri partecipanti={catena.partecipanti} />
        )}

        {possoDecidere ? (
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <AppButton
              label="Accetta il ciclo"
              icon="checkmark-outline"
              loading={azioneDiQuestaCatena?.tipo === 'decidi'}
              onPress={() => onDecidi(catena.id, 'ACCETTA')}
              accessibilityLabel="Accetta il ciclo proposto: confermi di dare il tuo servizio e di ricevere quello atteso"
            />
            <AppButton
              label="Rifiuta"
              variant="secondary"
              icon="close-outline"
              onPress={() => onDecidi(catena.id, 'RIFIUTA')}
              accessibilityLabel="Rifiuta il ciclo proposto: la catena salta per tutti"
            />
          </View>
        ) : null}

        {vista === VISTE.CATENA.IN_CONFERME && miaDecisione ? (
          <AppText variant="small" tone="secondary">
            {miaDecisione === 'ACCEPT'
              ? 'Hai accettato il ciclo: si attende la decisione degli altri partecipanti.'
              : 'Hai rifiutato il ciclo.'}
          </AppText>
        ) : null}

        {/* In IN_RICERCA solo l'initiator può uscire (contratto: 403 agli altri);
            dopo la proposta, l'annullamento è aperto a ogni partecipante. */}
        {(vista !== VISTE.CATENA.IN_RICERCA || catena.sonoInitiator) ? (
          <AppButton
            label="Annulla la catena"
            variant="secondary"
            icon="exit-outline"
            loading={annullamentoInCorso}
            onPress={() => {
              setMotivo('');
              setErroreMotivo(null);
              setConfermaAnnullamento(true);
            }}
            accessibilityLabel="Annulla la catena: serve un motivo, e la decisione vale per tutti"
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
      </View>

      <ModalConferma
        visible={confermaAnnullamento}
        titolo="Annullare la catena?"
        messaggio="La catena salta per tutti i partecipanti, e i servizi impegnati tornano liberi. Se era confermata, chi non ha ricevuto il servizio riceverà un buono di compensazione."
        etichettaConferma="Annulla la catena"
        loading={annullamentoInCorso}
        confermaDisabilitata={!motivoValido}
        onConferma={() => void confermaAnnullamentoConMotivo()}
        onAnnulla={() => setConfermaAnnullamento(false)}
      >
        <AppInput
          label="Motivo (obbligatorio)"
          value={motivo}
          onChangeText={cambiaMotivo}
          placeholder="Perché annulli la catena?"
          maxLength={255}
          multiline
          error={erroreMotivo}
          editable={!annullamentoInCorso}
        />
      </ModalConferma>
    </Card>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { BarraPillole } from './BarraPillole';
import { Card } from './Card';
import { ChipTono } from './ChipTono';
import { nomePersona } from '@/servizi/offerta-ricerca';
import {
  AZIONI_UTENTE,
  azioniConsentite,
  etichettaRuolo,
  etichettaStatoUtente,
  ruoliAssegnabili,
  statiAssegnabili,
  tonoRuolo,
  tonoStatoUtente,
} from '@/servizi/staff-utenti';
import { space } from '@/theme/tokens';

/**
 * La card di un utente nell'elenco dell'area staff.
 *
 * Mostra quello che serve per decidere: nome, username, ruolo e stato. I comandi
 * compaiono **solo** se `azioniConsentite` li ammette: la UI non offre un
 * pulsante che il backend rifiuterebbe, e le regole non vivono qui (stanno in
 * `servizi/staff-utenti.js`, che replica `userRoleManager.php` e
 * `userStatoManager.php`).
 *
 * Il comando non cambia niente da solo: apre un pannello con i valori possibili e
 * la scelta passa alla conferma della schermata (`ModalConferma`), perché
 * cambiare un ruolo o sospendere una persona è un'azione che riguarda qualcun
 * altro. Il pannello si chiude toccando una pillola o «Annulla».
 *
 * Le etichette accessibili nominano **la persona** («Cambia il ruolo di Mario
 * Rossi»): in un elenco di righe ripetute un «Cambia ruolo» nudo non dice su chi.
 */
export function CardUtenteStaff({ utente, io, azioneInCorso = null, onScegli }) {
  const [pannello, setPannello] = useState(null);

  const azioni = azioniConsentite(io, utente);
  const puoRuolo = azioni.includes(AZIONI_UTENTE.RUOLO);
  const puoStato = azioni.includes(AZIONI_UTENTE.STATO);
  const nome = nomePersona(utente);
  const mio = statoInCorso(azioneInCorso, utente.id);

  const scelteRuolo = ruoliAssegnabili(io, utente)
    .filter((ruolo) => ruolo !== utente.ruolo)
    .map((ruolo) => ({ valore: ruolo, etichetta: etichettaRuolo(ruolo) }));
  const scelteStato = statiAssegnabili(io, utente).map((stato) => ({
    valore: stato,
    etichetta: etichettaStatoUtente(stato),
  }));

  function scegli(tipo, valore) {
    setPannello(null);
    onScegli(tipo, utente, valore);
  }

  return (
    <Card>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm }}
      >
        <View style={{ flexShrink: 1, gap: space.xs }}>
          <AppText variant="heading" style={{ fontSize: 17 }}>
            {nome}
          </AppText>
          <AppText variant="small" tone="secondary">
            {utente.username ? `@${utente.username}` : 'Username non disponibile'}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, justifyContent: 'flex-end' }}>
          <ChipTono tono={tonoRuolo(utente.ruolo)}>
            {etichettaRuolo(utente.ruolo) ?? 'Ruolo sconosciuto'}
          </ChipTono>
          <ChipTono tono={tonoStatoUtente(utente.stato)}>
            {etichettaStatoUtente(utente.stato) ?? 'Stato sconosciuto'}
          </ChipTono>
        </View>
      </View>

      {puoRuolo || puoStato ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {puoRuolo ? (
            <AppButton
              label="Cambia ruolo"
              variant="secondary"
              icon="swap-horizontal-outline"
              disabled={mio}
              loading={mio && azioneInCorso.tipo === AZIONI_UTENTE.RUOLO}
              onPress={() => setPannello((precedente) => (precedente === AZIONI_UTENTE.RUOLO ? null : AZIONI_UTENTE.RUOLO))}
              accessibilityLabel={`Cambia il ruolo di ${nome}`}
              style={{ flex: 1 }}
            />
          ) : null}
          {puoStato ? (
            <AppButton
              label="Cambia stato"
              variant="secondary"
              icon="power-outline"
              disabled={mio}
              loading={mio && azioneInCorso.tipo === AZIONI_UTENTE.STATO}
              onPress={() => setPannello((precedente) => (precedente === AZIONI_UTENTE.STATO ? null : AZIONI_UTENTE.STATO))}
              accessibilityLabel={`Cambia lo stato di ${nome}`}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      ) : (
        <AppText variant="small" tone="secondary">
          Su questo account non hai azioni: o è il tuo, o il tuo ruolo non lo consente.
        </AppText>
      )}

      {pannello === AZIONI_UTENTE.RUOLO && scelteRuolo.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="small" tone="secondary">
            {`Nuovo ruolo per ${nome}:`}
          </AppText>
          <BarraPillole
            accessibilityLabel={`Nuovo ruolo per ${nome}`}
            scelte={scelteRuolo}
            valore={null}
            onChange={(valore) => scegli(AZIONI_UTENTE.RUOLO, valore)}
          />
        </View>
      ) : null}

      {pannello === AZIONI_UTENTE.STATO && scelteStato.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="small" tone="secondary">
            {`Nuovo stato per ${nome}:`}
          </AppText>
          <BarraPillole
            accessibilityLabel={`Nuovo stato per ${nome}`}
            scelte={scelteStato}
            valore={null}
            onChange={(valore) => scegli(AZIONI_UTENTE.STATO, valore)}
          />
        </View>
      ) : null}

      {pannello !== null ? (
        <AppButton
          label="Annulla"
          variant="ghost"
          icon="close-outline"
          onPress={() => setPannello(null)}
          accessibilityLabel={`Chiudi la scelta per ${nome}`}
          style={{ alignSelf: 'flex-start' }}
        />
      ) : null}
    </Card>
  );
}

/** `true` se l'azione in corso riguarda proprio questo utente. */
function statoInCorso(azioneInCorso, id) {
  return azioneInCorso !== null && Number(azioneInCorso.id) === Number(id);
}

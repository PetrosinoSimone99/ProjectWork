import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { nomePersona } from '@/servizi/offerta-ricerca';
import { etichettaMotivo, etichettaStatoSegnalazione, testoRiferimento, tonoStatoSegnalazione } from '@/servizi/segnalazioni';
import { descriviEsitiChiusi, puoPrendereInCarico, puoiChiudere } from '@/servizi/staff';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * La card di una segnalazione nell'elenco della staff.
 *
 * Mostra quello che serve per decidere: chi ha segnalato, chi è segnalato, il
 * motivo, il fatto a cui la segnalazione si aggancia e la data. La descrizione
 * completa sta dietro «Mostra tutto» — è il racconto, non la sintesi — e le
 * azioni compaiono **solo** se la pratica non è chiusa: la UI non offre un
 * pulsante che il backend rifiuterebbe.
 *
 * L'anteprima si accorcia con un limite dichiarato e non misurando il testo: la
 * misura dipende dal carattere e dalla larghezza, il limite no.
 *
 * Le etichette accessibili nominano la persona segnalata («Prendi in carico la
 * segnalazione su Mario Rossi»): in un elenco di card ripetute un «Prendi in
 * carico» nudo non dice su chi.
 */

/** Oltre questa lunghezza la descrizione si accorcia dietro «Mostra tutto». */
const LIMITE_ANTEPRIMA = 140;

export function CardSegnalazioneStaff({
  segnalazione,
  azioneInCorso = null,
  onPrendiInCarico,
  onApriChiusura,
}) {
  const t = useTokens();
  const [espansa, setEspansa] = useState(false);

  const palette = {
    info: { background: t.background, color: t.textSecondary },
    accent: { background: t.accentBg, color: t.accentText },
    service: { background: t.serviceBg, color: t.serviceText },
  }[tonoStatoSegnalazione(segnalazione.stato)];

  const stato = etichettaStatoSegnalazione(segnalazione.stato) ?? 'Stato sconosciuto';
  const nomeSegnalato = nomePersona(segnalazione.segnalato);
  const riferimento = testoRiferimento(segnalazione.riferimento);
  const descrizione = segnalazione.descrizione ?? '';
  const accorciabile = descrizione.length > LIMITE_ANTEPRIMA;
  const esiti = descriviEsitiChiusi(segnalazione.esiti);

  return (
    <Card>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}
      >
        <Chip background={palette.background}>
          <AppText variant="caption" style={{ color: palette.color }}>
            {stato}
          </AppText>
        </Chip>
        <AppText variant="small" tone="secondary">
          {segnalazione.creataIl ?? 'Data non disponibile'}
        </AppText>
      </View>

      <View style={{ gap: space.xs }}>
        <AppText variant="heading" style={{ fontSize: 17 }}>
          {etichettaMotivo(segnalazione.motivo) ?? 'Motivo non indicato'}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="person-outline" size={15} color={t.textSecondary} />
          <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
            {`${nomePersona(segnalazione.autore)} segnala ${nomeSegnalato}`}
          </AppText>
        </View>
        {riferimento ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons name="link-outline" size={15} color={t.textSecondary} />
            <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
              {`Riguarda ${riferimento}`}
            </AppText>
          </View>
        ) : null}
      </View>

      {descrizione ? (
        <View style={{ gap: space.xs }}>
          <AppText variant="body" numberOfLines={espansa ? undefined : 3}>
            {descrizione}
          </AppText>
          {accorciabile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={espansa ? 'Mostra meno della descrizione' : 'Mostra tutta la descrizione'}
              onPress={() => setEspansa((precedente) => !precedente)}
              hitSlop={6}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                borderRadius: radius.input,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppText variant="small" tone="primary">
                {espansa ? 'Mostra meno' : 'Mostra tutto'}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <AppText variant="small" tone="secondary">
          Nessuna descrizione: la segnalazione ha solo il motivo.
        </AppText>
      )}

      {esiti ? (
        <AppText variant="small" tone="secondary">
          {`Esito: ${esiti}`}
        </AppText>
      ) : null}
      {segnalazione.nota ? (
        <AppText variant="small" tone="secondary">
          {`Nota della staff: ${segnalazione.nota}`}
        </AppText>
      ) : null}

      {puoiChiudere(segnalazione) ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {puoPrendereInCarico(segnalazione) ? (
            <AppButton
              label="Prendi in carico"
              variant="secondary"
              icon="eye-outline"
              loading={azioneInCorso === 'carico'}
              disabled={azioneInCorso !== null}
              onPress={onPrendiInCarico}
              accessibilityLabel={`Prendi in carico la segnalazione su ${nomeSegnalato}`}
              style={{ flex: 1 }}
            />
          ) : null}
          <AppButton
            label="Chiudi"
            icon="checkmark-done-outline"
            disabled={azioneInCorso !== null}
            onPress={onApriChiusura}
            accessibilityLabel={`Chiudi la segnalazione su ${nomeSegnalato}`}
            style={{ flex: 1 }}
          />
        </View>
      ) : (
        <AppText variant="small" tone="secondary">
          Pratica chiusa: non ci sono azioni da fare.
        </AppText>
      )}
    </Card>
  );
}

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { formattaDataIso } from '@/accordi/stati';
import { nomePersona } from '@/servizi/offerta-ricerca';
import {
  VISTE,
  etichettaMotivoAnnullamento,
  etichettaStatoCatena,
  formattaDataOra,
  partecipantiInOrdine,
  tonoStatoCatena,
} from '@/servizi/catene';
import { space, useTokens } from '@/theme/tokens';

/**
 * Una riga dello storico: una catena **completata** (con la data di
 * completamento) o **saltata** (chi l'ha annullata, quando e con quale motivo —
 * grezzo se il motivo non è uno di quelli noti).
 *
 * È di **sola lettura**: niente `puoiChiedereToken` (il diritto al buono lo
 * dichiara il backend con `GET /api/tokens`, e i buoni stanno nella loro
 * sezione della schermata) e niente segnalazioni (fuori perimetro del passo,
 * come da piano). È **pura**: dati dall'esterno, nessuno stato, nessuna
 * chiamata.
 */
export function CardCatenaConclusa({ catena }) {
  const t = useTokens();
  const tono = tonoStatoCatena(catena.stato);
  const colori =
    tono === 'service'
      ? { background: t.serviceBg, testo: t.serviceText }
      : { background: t.background, testo: t.textSecondary };
  const etichetta = etichettaStatoCatena(catena.stato) ?? 'Stato sconosciuto';
  const nomi = partecipantiInOrdine(catena.partecipanti)
    .filter((partecipante) => !partecipante.sonoIo)
    .map((partecipante) => nomePersona(partecipante.persona));
  const dataFine =
    catena.vista === VISTE.CATENA.COMPLETATA
      ? (formattaDataOra(catena.completedAt) ?? formattaDataIso(catena.completedAt))
      : (formattaDataOra(catena.cancelledAt) ?? formattaDataIso(catena.cancelledAt));
  const motivo = etichettaMotivoAnnullamento(catena.annullata?.motivo);
  const annullataDaMe =
    catena.annullata?.daUtenteId !== null &&
    catena.annullata?.daUtenteId !== undefined &&
    catena.partecipanti.some(
      (partecipante) =>
        partecipante.sonoIo &&
        Number(partecipante.persona.id) === Number(catena.annullata.daUtenteId),
    );

  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <Chip background={colori.background}>
          <AppText variant="caption" style={{ color: colori.testo }}>
            {etichetta}
          </AppText>
        </Chip>
        {dataFine ? (
          <AppText variant="small" tone="secondary">
            {dataFine}
          </AppText>
        ) : null}
      </View>

      {nomi.length > 0 ? (
        <AppText variant="small" tone="secondary">
          {`Con: ${nomi.join(', ')}`}
        </AppText>
      ) : null}

      {catena.vista === VISTE.CATENA.ANNULLATA && catena.annullata ? (
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Ionicons name="exit-outline" size={14} color={t.textSecondary} />
            <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
              {annullataDaMe
                ? `Hai annullato tu la catena${catena.annullata.quando ? ` il ${formattaDataOra(catena.annullata.quando) ?? ''}` : ''}`
                : `Annullata da ${nomePersona(catena.annullata.persona)}${catena.annullata.quando ? ` il ${formattaDataOra(catena.annullata.quando) ?? ''}` : ''}`}
            </AppText>
          </View>
          {motivo ? (
            <AppText variant="small" tone="secondary">
              {motivo}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {catena.vista === VISTE.CATENA.COMPLETATA ? (
        <AppText variant="small" style={{ color: t.successText, fontWeight: '600' }}>
          Lo scambio è andato a buon fine: tutti hanno ricevuto il servizio atteso.
        </AppText>
      ) : null}
    </Card>
  );
}

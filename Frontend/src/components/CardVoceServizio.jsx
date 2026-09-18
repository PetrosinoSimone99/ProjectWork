import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import {
  ETICHETTE_STATO_PUBBLICAZIONE,
  STATI_PUBBLICAZIONE,
  TIPI_VOCE,
  etichettaModalita,
  nomeCategoria,
  tonoStatoPubblicazione,
} from '@/servizi/offerta-ricerca';
import { space, useTokens } from '@/theme/tokens';

/**
 * Una voce pubblicata: che tipo è, in che stato, cosa dice, e le tre azioni.
 *
 * Solo dati e callback: nessuno stato proprio, nessuna chiamata di rete. È la
 * card che la schermata «Offro e cerco» usa per le proprie offerte e ricerche, e
 * la useranno anche la home («le mie pubblicazioni») e il Profilo quando
 * mostreranno le voci dell'utente.
 *
 * `azioneInCorso` è `null` oppure il nome dell'azione in volo su **questa** voce
 * (`'stato'` o `'elimina'`): così lo spinner compare sul pulsante giusto e le
 * altre card restano usabili.
 */

const ETICHETTE_TIPO = {
  [TIPI_VOCE.OFFERTA]: 'Offerta',
  [TIPI_VOCE.RICERCA]: 'Ricerca',
};

/** `un'offerta` / `una ricerca`, per le etichette accessibili delle azioni. */
const ARTICOLI = {
  [TIPI_VOCE.OFFERTA]: "un'offerta",
  [TIPI_VOCE.RICERCA]: 'una ricerca',
};

export function CardVoceServizio({
  voce,
  categorie = [],
  azioneInCorso = null,
  disabilitato = false,
  onModifica,
  onCambiaStato,
  onElimina,
}) {
  const t = useTokens();

  // Senza id non si può modificare, sospendere né eliminare: mai una richiesta
  // con `id: undefined` (lezione di P37).
  const idValido = Number.isInteger(voce.id);
  const occupato = azioneInCorso !== null;
  const bloccato = disabilitato || occupato || !idValido;

  const sospesa = voce.stato === STATI_PUBBLICAZIONE.SOSPESA;
  const azioneStato = sospesa ? 'Ripubblica' : 'Sospendi';
  const nomeCategoriaVoce = nomeCategoria(categorie, voce.idCategoria);
  const testoVoce = voce.mansione.trim() || 'Mansione non indicata';
  const articolo = ARTICOLI[voce.tipo] ?? 'la voce';

  // Pubblicata -> verde tenue (service); sospesa o stato sconosciuto -> neutro.
  const paletteStato =
    tonoStatoPubblicazione(voce.stato) === 'service'
      ? { background: t.serviceBg, color: t.serviceText }
      : { background: t.background, color: t.textSecondary };
  const etichettaStato =
    ETICHETTE_STATO_PUBBLICAZIONE[voce.stato] ?? voce.stato ?? 'Stato sconosciuto';

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Chip background={t.border}>
          <AppText variant="caption" style={{ color: t.text }}>
            {ETICHETTE_TIPO[voce.tipo] ?? voce.tipo}
          </AppText>
        </Chip>
        <Chip background={paletteStato.background}>
          <AppText variant="caption" style={{ color: paletteStato.color }}>
            {etichettaStato}
          </AppText>
        </Chip>
      </View>

      <View style={{ gap: space.xs }}>
        <AppText>{testoVoce}</AppText>
        <AppText variant="small" tone="secondary">
          {nomeCategoriaVoce ?? 'Categoria non disponibile'}
        </AppText>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' }}
        >
          {voce.localita ? (
            <>
              <Ionicons name="location-outline" size={14} color={t.textSecondary} />
              <AppText variant="small" tone="secondary">
                {voce.localita}
              </AppText>
              <AppText variant="small" tone="secondary">
                ·
              </AppText>
            </>
          ) : null}
          <AppText variant="small" tone="secondary">
            {etichettaModalita(voce.daRemoto)}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <AppButton
          label="Modifica"
          variant="secondary"
          icon="create-outline"
          disabled={bloccato}
          onPress={() => onModifica(voce)}
          accessibilityLabel={`Modifica ${articolo}: ${testoVoce}`}
        />
        <AppButton
          label={azioneStato}
          variant="secondary"
          icon={sospesa ? 'eye-outline' : 'eye-off-outline'}
          disabled={bloccato}
          loading={azioneInCorso === 'stato'}
          onPress={() => onCambiaStato(voce)}
          accessibilityLabel={`${azioneStato} ${articolo}: ${testoVoce}`}
        />
        <AppButton
          label="Elimina"
          variant="danger"
          icon="trash-outline"
          disabled={bloccato}
          loading={azioneInCorso === 'elimina'}
          onPress={() => onElimina(voce)}
          accessibilityLabel={`Elimina ${articolo}: ${testoVoce}`}
        />
      </View>
    </Card>
  );
}

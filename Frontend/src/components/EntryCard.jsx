import { View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import {
  ETICHETTE_STATO_PUBBLICAZIONE,
  TIPI_VOCE,
  etichettaModalita,
  nomeCategoria,
  tonoStatoPubblicazione,
} from '@/services/offer-request';
import { localitaPerDisplay } from '@/services/italian-locations';
import { space, useTokens } from '@/theme/tokens';

/**
 * Una voce pubblicata: che tipo è, in che stato, cosa dice, e l'unica azione.
 *
 * Solo dati e callback: nessuno stato proprio, nessuna chiamata di rete. È la
 * card che la schermata «Offro e cerco» usa per le proprie offerte e ricerche, e
 * la useranno anche la home («le mie pubblicazioni») e il Profilo quando
 * mostreranno le voci dell'utente.
 *
 * L'unica azione è «Modifica»: ogni account ha sempre un'offerta e una ricerca,
 * entrambe obbligatorie, quindi sospendere o eliminare una voce renderebbe
 * l'account inutilizzabile. Il backend risponde `409` a `DELETE` e a una
 * `PATCH` di solo stato, e un comando che non può riuscire non si disegna
 * (`design-system.md`). Il chip dello stato resta: una voce sospesa prima di
 * questa regola deve restare leggibile, senza bisogno di un pulsante.
 *
 * Due motivi diversi spengono il comando, e sono due interruttori diversi.
 * `modificaDisabilitata` dice che mancano le categorie: senza di esse non si
 * pubblica né si modifica, perché sono un campo obbligatorio del form.
 * `azioniDisabilitate` dice che una scrittura è in volo da qualche parte nella
 * schermata: mentre si scrive sul server una seconda scrittura non deve partire.
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

export function EntryCard({
  voce,
  categorie = [],
  modificaDisabilitata = false,
  azioniDisabilitate = false,
  onModifica,
}) {
  const t = useTokens();

  // Senza id non si può modificare: mai una richiesta con `id: undefined`
  // (lezione di P37).
  const idValido = Number.isInteger(voce.id);
  const disabilitaModifica = modificaDisabilitata || azioniDisabilitate || !idValido;

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
              <AppIcon name="location-outline" size={14} color={t.textSecondary} />
              <AppText variant="small" tone="secondary">
                {localitaPerDisplay(voce.localita)}
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

      {/* L'unica azione resta sola sulla riga: le due che la affiancavano
          (sospendi, elimina) sono sparite con la regola «una voce per tipo,
          obbligatoria» e non si disegnano spente. */}
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <AppButton
            label="Modifica"
            variant="secondary"
            icon="create-outline"
            disabled={disabilitaModifica}
            onPress={() => onModifica(voce)}
            accessibilityLabel={`Modifica ${articolo}: ${testoVoce}`}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Card>
  );
}

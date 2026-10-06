import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { DECISIONI_PROPOSTA, descriviProposta } from '@/servizi/candidati';
import { nomeCategoria, nomePersona } from '@/servizi/offerta-ricerca';
import { space } from '@/theme/tokens';

/**
 * Le **proposte in attesa** della mia decisione: chi mi ha proposto uno scambio
 * aspetta un «Sì» o un «No», e il match lo dichiara il backend solo sul «Sì».
 *
 * Puro e senza rete: riceve già la lista normalizzata (`{id, persona,
 * servizio}`) e le due azioni, e disegna. La decisione in volo mostra lo
 * spinner sul comando premuto e tiene disabilitato l'altro finché la risposta
 * non torna; la riga decisa sparisce perché l'ha tolta la macchina a stati.
 *
 * Come `CardCandidato`, ogni riga è un **gruppo con un'etichetta sola**
 * (`descriviProposta`) e il contenuto testuale è `aria-hidden`. I **pulsanti
 * restano fuori** da quell'involucro: dentro non avrebbero un nome accessibile
 * e un lettore di schermo non li vedrebbe (difetto trovato e riparato il 3
 * ottobre 2026, durante la prova del flusso).
 *
 * Con la lista vuota la sezione non esiste: niente da decidere, niente da
 * dire. Il vuoto totale del Loop resta quello del feed (`EmptyState` in
 * `loop.jsx`), che è l'unico stato esplicito della schermata. L'etichetta è una
 * riga discreta (`caption` secondaria): il titolo forte della schermata è
 * quello del deck, in `loop.jsx`.
 */
export function SezioneProposte({
  proposte,
  categorie = [],
  decisioneInCorso = null,
  accetta,
  rifiuta,
}) {
  if (proposte.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="caption" tone="secondary">
        Proposte in attesa
      </AppText>
      {proposte.map((proposta) => {
        const nome = nomePersona(proposta.persona);
        const categoria =
          nomeCategoria(categorie, proposta.servizio.idCategoria) ?? 'Categoria non disponibile';
        const mansione = proposta.servizio.mansione.trim() || 'Mansione non indicata';
        const inCorso =
          decisioneInCorso?.id === proposta.id ? decisioneInCorso.decisione : null;
        return (
          <Card
            key={proposta.id}
            role="group"
            accessibilityLabel={descriviProposta(proposta, categorie)}
          >
            {/* `aria-hidden`: la riga parla con una sola frase (quella del
                gruppo). I pulsanti qui sotto restano fuori (vedi sopra). */}
            <View aria-hidden={true} style={{ gap: space.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: space.sm,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <AppText variant="heading">{nome}</AppText>
                {proposta.persona.username ? (
                  <AppText variant="small" tone="secondary">
                    {`@${proposta.persona.username}`}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="body">{`Offre: ${categoria} · ${mansione}`}</AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <AppButton
                label="Accetta"
                icon="checkmark-outline"
                loading={inCorso === DECISIONI_PROPOSTA.ACCETTA}
                disabled={decisioneInCorso !== null}
                onPress={() => void accetta(proposta.id)}
                accessibilityLabel={`Accetta la proposta di ${nome}`}
              />
              <AppButton
                label="Rifiuta"
                variant="secondary"
                icon="close-outline"
                loading={inCorso === DECISIONI_PROPOSTA.RIFIUTA}
                disabled={decisioneInCorso !== null}
                onPress={() => void rifiuta(proposta.id)}
                accessibilityLabel={`Rifiuta la proposta di ${nome}`}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

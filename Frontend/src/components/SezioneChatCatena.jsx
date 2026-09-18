/**
 * Le **due** conversazioni 1:1 della catena, mai una chat di gruppo: chi mi offre
 * il servizio che voglio e chi vuole il servizio che offro.
 *
 * Gli interlocutori si **leggono** dai versi dichiarati dal backend
 * (`contropartiChat`): se `offre_a` manca, la sezione non compare e la stessa
 * persona non viene duplicata. È **puro**: i membri e la callback arrivano
 * dall'esterno.
 */

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card } from './Card';
import { nomePersona } from '@/servizi/offerta-ricerca';
import { contropartiChat } from '@/servizi/coda';
import { space } from '@/theme/tokens';

const ETICHETTE_RUOLO = {
  MI_OFFRE: 'ti offre il servizio che cerchi',
  RICEVE_DA_ME: 'cerca il servizio che offri',
};

export function SezioneChatCatena({ membri, onApriChat }) {
  const io = membri.find((membro) => membro.sonoIo) ?? null;
  const controparti = contropartiChat(io, membri);
  if (controparti.length === 0) {
    return null;
  }

  return (
    <Card style={{ gap: space.sm }}>
      <AppText variant="heading">Le tue chat</AppText>
      <AppText variant="small" tone="secondary">
        Sono due conversazioni separate: con chi ti offre il servizio che cerchi e con chi cerca il
        servizio che offri.
      </AppText>
      {controparti.map((controparte) => (
        <AppButton
          key={String(controparte.persona.id)}
          label={`Scrivi a ${nomePersona(controparte.persona)}`}
          variant="secondary"
          icon="chatbubble-ellipses-outline"
          accessibilityLabel={`Scrivi a ${nomePersona(controparte.persona)}: ${
            ETICHETTE_RUOLO[controparte.ruolo] ?? 'conversazione della catena'
          }`}
          onPress={() => onApriChat(controparte)}
          style={{ alignSelf: 'stretch' }}
        />
      ))}
    </Card>
  );
}

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { formattaData } from '@/accordi/stati';
import { nomePersona } from '@/servizi/offerta-ricerca';
import {
  etichettaStatoGruppo,
  membriInOrdine,
  testoUscita,
  tonoStatoGruppo,
} from '@/servizi/coda';
import { space, useTokens } from '@/theme/tokens';

/**
 * Una riga dello storico: una catena conclusa o saltata, con la data, l'esito,
 * i partecipanti e — sulle saltate — **chi è uscito**, che è la riga da cui nasce
 * la richiesta di token.
 *
 * È **puro**: dati e categorie dall'esterno, sola lettura, nessuna azione. La
 * riga del token compare **solo** quando il backend dichiara che sono la parte
 * danneggiata (`puoiChiedereToken`): il frontend non lo deduce e non chiede
 * all'utente di dichiararlo. La richiesta vera si fa nella schermata della
 * segnalazione, che non esiste ancora: qui c'è il rimando scritto, **senza** un
 * pulsante che non porta da nessuna parte.
 */
export function CardCatenaConclusa({ gruppo, utenteId }) {
  const t = useTokens();
  const data = formattaData(gruppo.conclusoIl);
  const tono = tonoStatoGruppo(gruppo.stato);
  const colori =
    tono === 'service'
      ? { background: t.serviceBg, testo: t.serviceText }
      : { background: t.background, testo: t.textSecondary };
  const etichetta = etichettaStatoGruppo(gruppo.stato) ?? 'Stato sconosciuto';
  const nomi = membriInOrdine(gruppo.membri)
    .filter((membro) => !membro.sonoIo)
    .map((membro) => nomePersona(membro.persona));
  const uscita = testoUscita(gruppo.uscita, utenteId);
  const quandoUscita = formattaData(gruppo.uscita?.quando);

  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <Chip background={colori.background}>
          <AppText variant="caption" style={{ color: colori.testo }}>
            {etichetta}
          </AppText>
        </Chip>
        {data ? (
          <AppText variant="small" tone="secondary">
            {data}
          </AppText>
        ) : null}
      </View>

      {nomi.length > 0 ? (
        <AppText variant="small" tone="secondary">
          {`Con: ${nomi.join(', ')}`}
        </AppText>
      ) : null}

      {uscita ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Ionicons name="exit-outline" size={14} color={t.textSecondary} />
          <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
            {quandoUscita ? `${uscita} (${quandoUscita})` : uscita}
          </AppText>
        </View>
      ) : null}

      {gruppo.uscita?.motivo ? (
        <AppText variant="small" tone="secondary">
          {gruppo.uscita.motivo}
        </AppText>
      ) : null}

      {gruppo.puoiChiedereToken ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.xs }}>
          <Ionicons name="ticket-outline" size={15} color={t.tokenText} style={{ marginTop: 1 }} />
          <AppText variant="small" style={{ color: t.tokenText, flex: 1 }}>
            Hai offerto il tuo servizio ma non hai ricevuto quello che chiedevi: puoi chiedere un
            token dalla segnalazione.
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

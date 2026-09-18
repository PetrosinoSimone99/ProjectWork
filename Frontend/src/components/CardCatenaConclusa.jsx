import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
 * È **puro** nel senso dei dati e delle categorie: arrivano dall'esterno, la card
 * è di sola lettura e non decide esiti. La riga del token compare **solo** quando
 * il backend dichiara che sono la parte danneggiata (`puoiChiedereToken`): il
 * frontend non lo deduce e non chiede all'utente di dichiararlo. Quella riga
 * **apre i buoni** (`/token`), che sono l'unica destinazione esistente: la
 * richiesta vera si fa nella schermata della segnalazione, che non esiste ancora,
 * e sarà un'azione a parte.
 */
export function CardCatenaConclusa({ gruppo, utenteId }) {
  const t = useTokens();
  const router = useRouter();
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apri i tuoi token"
          onPress={() => router.push('/token')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: space.xs,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="ticket-outline" size={15} color={t.accentText} style={{ marginTop: 1 }} />
          <AppText variant="small" style={{ color: t.accentText, flex: 1 }}>
            Hai offerto il tuo servizio ma non hai ricevuto quello che chiedevi: la staff può
            riconoscerti un token. Tocca qui per vedere i tuoi token.
          </AppText>
          <Ionicons name="chevron-forward" size={15} color={t.accentText} style={{ marginTop: 1 }} />
        </Pressable>
      ) : null}
    </Card>
  );
}

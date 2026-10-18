import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import {
  AZIONI_BUONO,
  azioniDelBuono,
  descriviOrigine,
  etichettaStatoToken,
  statoDelBuono,
  STATI_TOKEN,
  testoDataEmissione,
  testoDataScadenza,
  testoDataUso,
  testoResiduoToken,
  tonoStatoToken,
} from '@/servizi/token';
import { space, useTokens } from '@/theme/tokens';

/**
 * La card di **un buono** («token»): stato, origine, date e i pulsanti dei
 * **suoi** attuali, secondo `azioniDelBuono` di `@/servizi/token` (la regola di
 * quali azioni spettano su uno stato del server vive lì: qui si chiama e si
 * disegna, nessuna logica duplicata).
 *
 * Perché un componente e non un pezzo della schermata: è la parte più lunga di
 * «I miei token» e non conosce né la rete né lo stato della schermata (riceve il
 * buono, il catalogo per il nome del servizio e le callback). È lo stesso schema
 * di `CardServizioCatalogo` e `CardVoceServizio`.
 *
 * Tre regole dentro:
 * - **il pulsante si disegna solo se la callback c'è**: una callback mancante
 *   (propia a `undefined`) non disegna il pulsante, così la schermata può
 *   collegare le azioni una alla volta senza pulsanti morti;
 * - **il nome del servizio non si inventa**: se il catalogo non lo conosce, resta
 *   il riferimento (`Servizio n. X`), non un nome plausibile;
 * - **il colore non è l'unico segnale**: la parola dello stato sta accanto.
 */
export function CardBuono({ buono, catalogo, azioneInCorso, onUsa, onAnnulla, onRicevuto }) {
  const router = useRouter();
  const t = useTokens();
  const colori = coloriTono(t, tonoStatoToken(buono.stato));
  const etichetta = etichettaStatoToken(buono.stato) ?? 'Stato non indicato';
  const origine = descriviOrigine(buono);
  const residuo = testoResiduoToken(buono);
  const emissione = testoDataEmissione(buono);
  const scadenza = testoDataScadenza(buono);
  const uso = testoDataUso(buono);
  const servizio = nomeServizio(catalogo, buono.idServizio)
  const azione = azioniDelBuono(buono);
  const impegnato = statoDelBuono(buono) === STATI_TOKEN.RESERVED;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <Chip background={colori.bg}>
          <AppText variant="caption" style={{ color: colori.fg }}>
            {etichetta}
          </AppText>
        </Chip>
        {residuo ? (
          <AppText variant="small" tone="secondary">
            {residuo}
          </AppText>
        ) : null}
      </View>

      {origine ? (
        <AppText variant="heading" style={{ fontSize: 16 }}>
          {origine}
        </AppText>
      ) : null}

      <View style={{ gap: space.xs }}>
        {emissione ? <RigaDato icona="calendar-outline" testo={`Ottenuto il ${emissione}`} /> : null}
        {scadenza ? <RigaDato icona="hourglass-outline" testo={`Scade il ${scadenza}`} /> : null}
        {uso ? <RigaDato icona="checkmark-done-outline" testo={`Usato il ${uso}`} /> : null}
        {servizio ? (
          <RigaDato icona="pricetag-outline" testo={`Servizio: ${servizio}`} />
        ) : buono.idServizio !== null && buono.idServizio !== undefined ? (
          <RigaDato icona="pricetag-outline" testo={`Servizio n. ${buono.idServizio}`} />
        ) : null}
      </View>

      {impegnato ? (
        <AppText variant="small" tone="secondary">
          {testoImpegnato(buono.statoRiscatto)}
        </AppText>
      ) : null}

      {azione.includes(AZIONI_BUONO.USA) && onUsa ? (
        <AppButton
          label="Usa su un servizio"
          icon="pricetag-outline"
          onPress={() => onUsa(buono)}
          disabled={azioneInCorso}
          accessibilityLabel={`Usa su un servizio il buono${origine ? `: ${origine}` : ''}`}
          style={stile.pulsante}
        />
      ) : null}

      {azione.includes(AZIONI_BUONO.ANNULLA) && onAnnulla ? (
        <AppButton
          label="Annulla impegno"
          variant="secondary"
          icon="arrow-undo-outline"
          onPress={() => onAnnulla(buono)}
          disabled={azioneInCorso}
          accessibilityLabel={`Annulla l'impegno del buono${origine ? `: ${origine}` : ''}`}
          style={stile.pulsante}
        />
      ) : null}

      {azione.includes(AZIONI_BUONO.RICEVUTO) ? (
        <View style={{ gap: space.xs }}>
          {onRicevuto ? (
            <AppButton
              label="Ho ricevuto il servizio"
              icon="checkmark-done-outline"
              onPress={() => onRicevuto(buono)}
              disabled={azioneInCorso}
              accessibilityLabel={`Conferma di aver ricevuto il servizio del buono${origine ? `: ${origine}` : ''}`}
              style={stile.pulsante}
            />
          ) : null}
          <AppButton
            label="Segnala un problema"
            variant="secondary"
            onPress={() => router.push('/segnala')}
            disabled={azioneInCorso}
            accessibilityLabel="Vai alla schermata di segnalazione per questo servizio"
            style={stile.pulsante}
          />
        </View>
      ) : null}
    </Card>
  );
}

const stile = StyleSheet.create({ pulsante: { alignSelf: 'flex-start' } });

/** I colori del tono di uno stato, dai token del tema (mai un colore scritto a mano). */
function coloriTono(t, tono) {
  if (tono === 'service') {
    return { bg: t.serviceBg, fg: t.serviceText };
  }
  if (tono === 'accent') {
    return { bg: t.accentBg, fg: t.accentText };
  }
  if (tono === 'danger') {
    return { bg: t.dangerBg, fg: t.dangerText };
  }
  return { bg: t.background, fg: t.textSecondary };
}

/** Il testo che accompagna un buono impegnato, a seconda dello stato del riscatto. */
function testoImpegnato(statoRiscatto) {
  if (statoRiscatto === 'PENDING') {
    return "Il proprietario del servizio deve ancora accettare. Se l'accordo salta puoi annullare l'impegno: il buono torna disponibile.";
  }
  if (statoRiscatto === 'ACCEPTED') {
    return 'Il servizio è stato accettato. Quando lo avrai ricevuto, conferma qui: il buono diventerà Usato.';
  }
  return 'Il buono è legato a uno scambio: lo aggiorna il sistema, non serve fare nulla qui.';
}

/** Il nome del servizio scelto, se il catalogo lo conosce: `null` invece di un nome inventato. */
function nomeServizio(catalogo, idServizio) {
  if (!Array.isArray(catalogo) || idServizio === null || idServizio === undefined) {
    return null;
  }
  const trovato = catalogo.find((servizio) => Number(servizio.id) === Number(idServizio));
  const descrizione = typeof trovato?.descrizione === 'string' ? trovato.descrizione.trim() : '';
  return descrizione || null;
}

/** Una riga icona + testo di un dato del buono. */
function RigaDato({ icona, testo }) {
  const t = useTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Ionicons name={icona} size={14} color={t.textSecondary} />
      <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
        {testo}
      </AppText>
    </View>
  );
}

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import {
  descriviOrigine,
  eImpegnato,
  etichettaStatoToken,
  puoEssereImpegnato,
  testoDataEmissione,
  testoDataScadenza,
  testoDataUso,
  testoResiduoToken,
  tonoStatoToken,
} from '@/servizi/token';
import { space, useTokens } from '@/theme/tokens';

/**
 * La card di **un buono** («token»): stato, origine, date e — solo se è
 * disponibile — l'azione per usarlo su un servizio.
 *
 * Perché un componente e non un pezzo della schermata: è la parte più lunga di
 * «I miei token» e non conosce né la rete né lo stato della schermata (riceve il
 * buono, il catalogo per il nome del servizio e una callback). È lo stesso schema
 * di `CardServizioCatalogo` e `CardVoceServizio`.
 *
 * Tre regole dentro:
 * - **nessuna azione sugli stati non disponibili**: un `RESERVED` è già legato a
 *   un accordo, un `SPENT` o un `EXPIRED` non si usa, e uno stato **ignoto** non
 *   si tocca perché non sappiamo cosa significhi;
 * - **il nome del servizio non si inventa**: se il catalogo non lo conosce, resta
 *   il riferimento (`Servizio n. X`), non un nome plausibile;
 * - **il colore non è l'unico segnale**: la parola dello stato sta accanto.
 */
export function CardBuono({ buono, catalogo, azioneInCorso, onUsa }) {
  const t = useTokens();
  const colori = coloriTono(t, tonoStatoToken(buono.stato));
  const etichetta = etichettaStatoToken(buono.stato) ?? 'Stato non indicato';
  const origine = descriviOrigine(buono);
  const residuo = testoResiduoToken(buono);
  const emissione = testoDataEmissione(buono);
  const scadenza = testoDataScadenza(buono);
  const uso = testoDataUso(buono);
  const servizio = nomeServizio(catalogo, buono.idServizioUsato);

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
        ) : buono.idServizioUsato !== null ? (
          <RigaDato icona="pricetag-outline" testo={`Servizio n. ${buono.idServizioUsato}`} />
        ) : null}
      </View>

      {eImpegnato(buono) ? (
        <AppText variant="small" tone="secondary">
          Il buono è legato a questo scambio: si consumerà quando lo scambio sarà concluso e tornerà
          disponibile se salta. Lo aggiorna il sistema, non serve fare nulla qui.
        </AppText>
      ) : null}

      {puoEssereImpegnato(buono) ? (
        <AppButton
          label="Usa su un servizio"
          icon="pricetag-outline"
          onPress={() => onUsa(buono)}
          disabled={azioneInCorso}
          accessibilityLabel={`Usa su un servizio il buono${origine ? `: ${origine}` : ''}`}
          style={{ alignSelf: 'flex-start' }}
        />
      ) : null}
    </Card>
  );
}

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

/** Il nome del servizio usato, se il catalogo lo conosce: `null` invece di un nome inventato. */
function nomeServizio(catalogo, idServizio) {
  if (!Array.isArray(catalogo) || idServizio === null || idServizio === undefined) {
    return null;
  }
  const trovato = catalogo.find((servizio) => Number(servizio.id) === Number(idServizio));
  const mansione = typeof trovato?.mansione === 'string' ? trovato.mansione.trim() : '';
  return mansione || null;
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

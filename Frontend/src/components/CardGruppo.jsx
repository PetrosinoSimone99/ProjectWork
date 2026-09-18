import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { nomePersona } from '@/servizi/offerta-ricerca';
import {
  VISTE,
  descriviGruppo,
  etichettaStatoGruppo,
  membriInOrdine,
  testoScadenza,
  tonoStatoGruppo,
} from '@/servizi/coda';
import { space, useTokens } from '@/theme/tokens';

/**
 * Il riquadro della catena, in **due taglie**:
 *
 * - `compatta` — per il «Loop»: chip dello stato, tempo residuo e chi c'è, in
 *   poche righe; tutta la card si tocca per aprire il dettaglio. È il modo in cui
 *   la ricerca diventa visibile **mentre si scorre**, senza interrompere lo swipe;
 * - completa — per la schermata `/scambi`: chip, conteggio, tempo con l'ora di
 *   scadenza, e sotto le azioni (passate come `children`, così il componente
 *   resta puro e non conosce «Esci»).
 *
 * Una stessa cosa in due posti: **un** componente, non due, altrimenti la
 * formattazione del tempo e i testi divergono.
 *
 * Accessibilità: la **regione viva è una sola** ed è questa card, con
 * `descriviGruppo(...)`. La riga del tempo **non** è una regione viva — un
 * annuncio ogni 15 secondi renderebbe inutilizzabile un lettore di schermo. Il
 * chip porta la **parola** oltre al colore, e uno stato sconosciuto si mostra
 * grezzo.
 */

/** Tono del chip: `service` per «Pronto», neutro per il resto. Il colore non è mai l'unico segnale. */
function coloriStato(tono, t) {
  return tono === 'service'
    ? { background: t.serviceBg, testo: t.serviceText }
    : { background: t.background, testo: t.textSecondary };
}

/** Il conteggio con la parola giusta: «1 persona», «2 di 4 persone», «4 persone». */
function testoMembri(gruppo) {
  const ricevuti = membriInOrdine(gruppo.membri).length;
  const totale = gruppo.numeroPartecipanti;
  const conteggio = Number.isInteger(totale) && totale > ricevuti ? `${ricevuti} di ${totale}` : `${ricevuti}`;
  const riferimento = Number.isInteger(totale) ? totale : ricevuti;
  return `${conteggio} ${riferimento === 1 ? 'persona' : 'persone'}`;
}

export function CardGruppo({
  gruppo,
  vista,
  scadenzaMs,
  tempo,
  categorie = [],
  compatta = false,
  onApri,
  children,
}) {
  const t = useTokens();
  if (!gruppo) {
    return null;
  }

  const tono = tonoStatoGruppo(gruppo.stato);
  const colori = coloriStato(tono, t);
  const etichetta = etichettaStatoGruppo(gruppo.stato) ?? 'Stato sconosciuto';
  const descrizione = descriviGruppo(gruppo, categorie);
  const elenco = membriInOrdine(gruppo.membri);
  const altre = elenco.filter((membro) => !membro.sonoIo).map((membro) => nomePersona(membro.persona));
  const mostraTempo =
    vista === VISTE.IN_RICERCA || (vista === VISTE.NEUTRA && Number.isFinite(scadenzaMs));

  const contenuto = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <Chip background={colori.background}>
          <AppText variant="caption" style={{ color: colori.testo }}>
            {etichetta}
          </AppText>
        </Chip>
        <AppText variant="small" tone="secondary">
          {testoMembri(gruppo)}
        </AppText>
      </View>

      {mostraTempo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Ionicons name="time-outline" size={15} color={t.textSecondary} />
          <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
            {testoScadenza(tempo, scadenzaMs)}
          </AppText>
        </View>
      ) : null}

      {altre.length > 0 ? (
        <AppText variant="small" tone="secondary" numberOfLines={2}>
          {`In catena con te: ${altre.join(', ')}`}
        </AppText>
      ) : null}

      {vista === VISTE.PRONTO ? (
        <AppText variant="small" style={{ color: t.successText, fontWeight: '600' }}>
          Il cerchio è chiuso: lo scambio può iniziare.
        </AppText>
      ) : null}

      {children}
    </>
  );

  // Compatta: tutta la card è il pulsante che apre il dettaglio. La regione viva
  // sta sull'elemento esterno, così l'annuncio dello stato non si perde.
  if (compatta) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${descrizione}. Apri il dettaglio della catena.`}
        onPress={onApri}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card style={{ gap: space.sm }}>{contenuto}</Card>
      </Pressable>
    );
  }

  return (
    <Card accessibilityLiveRegion="polite" accessibilityLabel={descrizione}>
      {contenuto}
    </Card>
  );
}

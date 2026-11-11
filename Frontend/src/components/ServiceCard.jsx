import { Pressable, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { formatIsoDate } from '@/services/dates';
import { etichettaModalita, nomePersona } from '@/services/offer-request';
import { localitaPerDisplay } from '@/services/italian-regions';
import { space, useTokens } from '@/theme/tokens';

/**
 * La card di un servizio del catalogo della home: la frase della persona,
 * la riga dei dati e la coda che apre il dettaglio.
 *
 * **Una sola anatomia** (direzione UX «A», audit UX F82, F93), tre parti:
 *
 * 1. il titolo — la frase di chi offre, 19/700, fino a tre righe. Prima era la
 *    categoria a stare in cima con il peso del titolo e la frase veniva tagliata
 *    a due righe: la card diceva la classe del servizio e non il servizio;
 * 2. una riga di dati, 13 e secondaria, con la pillola della categoria in linea
 *    accanto a modalità, luogo, data e autore. La categoria non torna sopra il
 *    titolo, e la pillola è una sola per card;
 * 3. un'azione in coda: il chevron che dice «questa riga si apre». La card è
 *    tutta un bottone, quindi l'azione non è un secondo comando separato.
 *
 * La card riempie la colonna di `Screen` (`layout.maxCatalogo`): la misura di
 * lettura la decide il telaio, non la card, che prima si fermava a 712 px dentro
 * una colonna da 1024 e lasciava scoperti 260 px (audit UX F80).
 *
 * Il modello è quello di `GET /api/services` (vedi `normalizzaOffertaCatalogo`):
 * la località è dell'**annuncio** (`servizio.localita`, dal 16/10/2026), con
 * ripiego su quella della persona; la descrizione è sempre presente (per
 * contratto), quindi non c'è nessun testo di ripiego da inventare.
 *
 * Non riusa `EntryCard`, che è la card delle **proprie** voci (tipo, stato
 * e le tre azioni di gestione): un componente che fa due mestieri non ne fa bene
 * nessuno. Qui non c'è nessun compenso (il modello non lo prevede) e non
 * c'è nessun caso «è il tuo annuncio», perché nel catalogo arrivano solo i
 * servizi degli altri.
 *
 * Solo dati e callback: nessuno stato proprio, nessuna chiamata di rete.
 */
export function ServiceCard({ servizio, onPress }) {
  const t = useTokens();

  // Senza id la card si disegna ma non apre niente: mai una richiesta con
  // `id: undefined` (lezione di P37). Con `GET /api/services` che restituisce
  // l'id, questo caso è un'anomalia da segnalare.
  const apribile = Number.isInteger(servizio.id);
  const categorie = servizio.categorie?.length ? servizio.categorie : null;
  const autore = nomePersona(servizio.offerente);
  const pubblicatoIl = formatIsoDate(servizio.pubblicatoIl);
  const localita = servizio.localita ?? servizio.offerente?.localita;
  // Una pillola sola per card (F82): più categorie restano leggibili nello stesso
  // spazio invece di spingere il titolo fuori dal primo sguardo.
  const etichettaCategoria = categorie
    ? categorie.map((categoria) => categoria.nome).join(' · ')
    : 'Categoria non disponibile';

  // Un `button` rende presentazionali i suoi discendenti: con la sola
  // descrizione nel nome accessibile, categoria, modalità, luogo, data e autore
  // — cioè tutto quello che la riga mostra — non venivano annunciati (F50).
  const nomeAccessibile = [
    categorie?.length ? etichettaCategoria : null,
    servizio.descrizione,
    etichettaModalita(servizio.daRemoto),
    localita ? localitaPerDisplay(localita) : null,
    pubblicatoIl ? `pubblicato il ${pubblicatoIl}` : null,
    autore,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Apri il servizio: ${nomeAccessibile}`}
      accessibilityState={{ disabled: !apribile }}
      aria-disabled={!apribile}
      disabled={!apribile}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ flex: 1, gap: space.md }}>
            {/* La card è un bottone: la descrizione dentro non è un titolo di
                pagina, quindi esce dal ruolo `header` della variante (F19). */}
            <AppText variant="heading" accessibilityRole="text" numberOfLines={3}>
              {servizio.descrizione}
            </AppText>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: space.sm,
              }}
            >
              <Chip background={t.serviceBg}>
                <AppText variant="caption" style={{ color: t.serviceText }}>
                  {etichettaCategoria}
                </AppText>
              </Chip>

              {/* La modalità è sempre nota (il contratto la manda come booleano),
                  quindi la voce compare sempre: l'icona distingue da remoto da
                  in presenza, e la parola lo dice a chi non vede l'icona. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <AppIcon
                  name={servizio.daRemoto ? 'videocam-outline' : 'people-outline'}
                  size={14}
                  color={t.textSecondary}
                />
                <AppText variant="small" tone="secondary">
                  {etichettaModalita(servizio.daRemoto)}
                </AppText>
              </View>

              {/* La località del servizio (ripiego: quella della persona) è
                  facoltativa: se manca, la voce non compare (niente trattino,
                  niente «N/D»). */}
              {localita ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <AppIcon name="location-outline" size={14} color={t.textSecondary} />
                  <AppText variant="small" tone="secondary">
                    {localitaPerDisplay(localita)}
                  </AppText>
                </View>
              ) : null}

              {pubblicatoIl ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <AppIcon name="calendar-outline" size={14} color={t.textSecondary} />
                  <AppText variant="small" tone="secondary">
                    Pubblicato il {pubblicatoIl}
                  </AppText>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <AppIcon name="person-outline" size={14} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {servizio.offerente?.username ? `${autore} @${servizio.offerente.username}` : autore}
                </AppText>
              </View>
            </View>
          </View>

          {/* La coda della riga: l'unica azione della card, allineata alla prima
              riga del titolo. Decorativa, perché il bottone ha già il suo nome. */}
          {apribile ? (
            <AppIcon
              name="chevron-forward"
              size={16}
              color={t.textSecondary}
              style={{ marginTop: space.xs }}
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

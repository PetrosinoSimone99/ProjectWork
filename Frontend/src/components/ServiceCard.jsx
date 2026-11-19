import { Pressable, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { formatIsoDate } from '@/services/dates';
import { etichettaModalita, nomePersona } from '@/services/offer-request';
import { localitaPerDisplay } from '@/services/italian-locations';
import { space, useTokens } from '@/theme/tokens';

/**
 * La card di un servizio del catalogo della home: la frase della persona,
 * la griglia dei dati e la coda che apre il dettaglio.
 *
 * **Una sola anatomia** (direzione UX «A», audit UX F82, F93), tre parti:
 *
 * 1. il titolo — la frase di chi offre, 19/700, fino a tre righe. Prima era la
 *    categoria a stare in cima con il peso del titolo e la frase veniva tagliata
 *    a due righe: la card diceva la classe del servizio e non il servizio;
 * 2. una griglia di dati, 13 e secondaria: due colonne uguali e tre righe
 *    (categoria e modalità, luogo e data, autore a tutta larghezza). La
 *    categoria non torna sopra il titolo, e la pillola è una sola per card;
 * 3. un'azione in coda: il chevron che dice «questa riga si apre». La card è
 *    tutta un bottone, quindi l'azione non è un secondo comando separato.
 *
 * La card riempie la colonna di `Screen` (`layout.maxCatalogo`): la misura di
 * lettura la decide il telaio, non la card, che prima si fermava a 712 px dentro
 * una colonna da 1024 e lasciava scoperti 260 px (audit UX F80).
 *
 * **Perché una griglia e non una riga che va a capo** (audit 2026-11-18 §P2):
 * le cinque voci erano un `flexWrap` in fila, quindi a 412 px ogni card andava
 * a capo in un punto diverso — quattro righe, poi due, poi tre — e il ritmo di
 * lettura si perdeva proprio nell'unica schermata che si scorre a colpo
 * d'occhio. Qui nessuna voce può andare a capo: ogni cella è una riga sola con
 * ellissi, la riga è sempre la stessa, e la colonna di ogni token è la stessa
 * in ogni card. La battuta fra le due colonne è il padding della cella di
 * sinistra e non un `gap`: due metà più un `gap` superano la riga, e il testo
 * andrebbe a capo di nuovo.
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

/** Una riga della griglia dei dati: due colonne uguali, senza `gap`.
 *
 * La prima cella porta la battuta a destra nel proprio padding, così le due
 * colonne misurano esattamente metà riga e il bordo di ogni colonna cade nello
 * stesso punto in tutte le card.
 */
const stileRigaDati = { flexDirection: 'row', alignItems: 'center' };

const stileCella = {
  flex: 1,
  // `minWidth: 0` è quello che permette al testo di accorciarsi invece di
  // allargare la cella: senza, la riga cresce oltre la card (F80).
  minWidth: 0,
  flexDirection: 'row',
  alignItems: 'center',
  gap: space.xs,
};

const stileCellaSinistra = { ...stileCella, paddingRight: space.md };

/**
 * La pillola della categoria si accorcia dentro la mezza riga invece di
 * allargarla.
 *
 * `flexShrink: 0` è il default di RN: senza questa regola la pillola teneva la
 * larghezza del proprio testo (175 px su «Assistenza computer») e si dipingeva
 * sopra l'icona della modalità a 375 e a 412 — 36 px e 17 px di sovrapposizione
 * sul catalogo seminato (finding `frontend-2026-11-19-catalog-chip-overlap`).
 * `minWidth: 0` è quello che le permette di scendere sotto la parola più lunga
 * invece di fermarsi lì: senza, il minimo automatico del flex item è il
 * contenuto e la pillola non si stringe.
 */
const stileChipNellaCella = { flexShrink: 1, minWidth: 0 };

/**
 * Una cella della griglia dei dati: icona 14 e un valore su **una riga sola**,
 * con ellissi quando il valore è lungo.
 *
 * L'icona è decorativa: il nome accessibile della card è uno solo e sta sul
 * `Pressable`, quindi queste celle non sono fermate di focus separate.
 */
function CellaDato({ icon, children, style }) {
  const t = useTokens();
  return (
    <View style={[stileCella, style]}>
      <AppIcon name={icon} size={14} color={t.textSecondary} />
      <AppText
        variant="small"
        tone="secondary"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {children}
      </AppText>
    </View>
  );
}

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

            <View style={{ gap: space.xs }}>
              {/* Riga 1 — categoria e modalità. La modalità è sempre nota (il
                  contratto la manda come booleano), quindi la voce compare
                  sempre: l'icona distingue da remoto da in presenza, e la
                  parola lo dice a chi non vede l'icona. */}
              <View style={stileRigaDati}>
                <View style={stileCellaSinistra}>
                  {/* La pillola si accorcia dentro la sua colonna invece di
                      allargarla: più categorie su una card non spostano
                      niente, e l'elenco intero resta nel nome accessibile.
                      L'ellissi la fa il testo, che deve poter scendere sotto la
                      propria larghezza minima: da qui `minWidth: 0`. */}
                  <Chip background={t.serviceBg} style={stileChipNellaCella}>
                    <AppText
                      variant="caption"
                      numberOfLines={1}
                      style={{ color: t.serviceText, flexShrink: 1, minWidth: 0 }}
                    >
                      {etichettaCategoria}
                    </AppText>
                  </Chip>
                </View>

                <CellaDato
                  icon={servizio.daRemoto ? 'videocam-outline' : 'people-outline'}
                >
                  {etichettaModalita(servizio.daRemoto)}
                </CellaDato>
              </View>

              {/* Riga 2 — luogo e data. La località (ripiego: quella della
                  persona) è facoltativa: se manca resta la cella vuota, che
                  tiene la colonna, e non compare nessun «N/D». */}
              <View style={stileRigaDati}>
                {localita ? (
                  <CellaDato icon="location-outline" style={stileCellaSinistra}>
                    {localitaPerDisplay(localita)}
                  </CellaDato>
                ) : (
                  <View style={stileCellaSinistra} />
                )}

                {/* La data sta nella sua colonna solo nella forma breve:
                    «Pubblicato il» accanto alla data non entra in mezza riga a
                    412 px e la data si troncherebbe. La parola la dice il
                    nome accessibile della card («pubblicato il …»), il
                    calendario la dice a chi guarda. */}
                {pubblicatoIl ? (
                  <CellaDato icon="calendar-outline">{pubblicatoIl}</CellaDato>
                ) : (
                  <View style={stileCella} />
                )}
              </View>

              {/* Riga 3 — l'autore, a tutta larghezza: è l'unico dato che in
                  mezza riga perderebbe il nome utente. */}
              <View style={stileRigaDati}>
                <CellaDato icon="person-outline">
                  {servizio.offerente?.username
                    ? `${autore} @${servizio.offerente.username}`
                    : autore}
                </CellaDato>
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

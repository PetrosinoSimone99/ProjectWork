import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import {
  MOTIVI_COMPATIBILITA,
  descriviCandidato,
  descriviRicerca,
  etichettaMotivo,
} from '@/servizi/candidati';
import { etichettaModalita, nomeCategoria, nomePersona } from '@/servizi/offerta-ricerca';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Il **contenuto** della scheda di «Loop»: la persona, una sua offerta, perché è
 * lì e — quando c'è — il like che ha già messo.
 *
 * È **puro**: nessun gesto, nessuna animazione, nessuno stato, nessuna chiamata.
 * Il trascinamento sta in `SchedaTrascinabile`, che lo avvolge: chi domani vuole
 * la stessa scheda dentro una lista importa questo componente e non si porta
 * dietro `PanResponder`.
 *
 * Un dettaglio di accessibilità che vale la pena capire: il contenitore è un
 * **gruppo con un'etichetta sola** (`descriviCandidato`), e il contenuto visivo è
 * `aria-hidden`. Così un lettore di schermo annuncia **una** frase — persona,
 * offerta, modalità, località, motivo e like — invece di cinque frammenti da
 * comporre. Su native `accessible` fa la stessa cosa; su web lo fa `role="group"`
 * più `aria-label`, perché `react-native-web` non legge `accessible`.
 */

/**
 * Le iniziali per l'avatar: nome e cognome, altrimenti l'iniziale dello username,
 * altrimenti `?`. Non c'è una foto nel contratto e non se ne inventa una.
 */
function iniziali(persona) {
  const parti = [persona?.nome, persona?.cognome].filter(
    (parte) => typeof parte === 'string' && parte.trim() !== '',
  );
  if (parti.length > 0) {
    return parti
      .map((parte) => parte.trim().charAt(0).toUpperCase())
      .join('');
  }
  const utente = typeof persona?.username === 'string' ? persona.username.trim() : '';
  return utente ? utente.charAt(0).toUpperCase() : '?';
}

/** Il motivo si mostra solo per i casi in cui serve a spiegare il «Cerca: …». */
const MOTIVI_CON_RICERCA = [
  MOTIVI_COMPATIBILITA.CERCA_QUELLO_CHE_OFFRO,
  MOTIVI_COMPATIBILITA.ENTRAMBI,
];

export function CardCandidato({ candidato, categorie = [] }) {
  const t = useTokens();

  const persona = candidato.persona;
  const offerta = candidato.offerta;
  const nome = nomePersona(persona);
  const categoria = nomeCategoria(categorie, offerta.idCategoria) ?? 'Categoria non disponibile';
  const mansione = offerta.mansione.trim() || 'Mansione non indicata';
  const motivo = etichettaMotivo(candidato.motivo);
  // «Cerca: …» si mostra **solo** quando serve a spiegare il motivo: se la
  // persona è lì solo perché mi ha messo like, cosa cerca non aggiunge nulla.
  const cerca =
    motivo && MOTIVI_CON_RICERCA.includes(candidato.motivo)
      ? descriviRicerca(candidato.ricerca, categorie)
      : null;

  return (
    <Card role="group" accessibilityLabel={descriviCandidato(candidato, categorie)}>
      {/* `aria-hidden`: la scheda parla con una frase sola (vedi sopra). */}
      <View aria-hidden={true} style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.pill,
              backgroundColor: t.serviceBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="heading" style={{ color: t.serviceText }}>
              {iniziali(persona)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: space.xs }}>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <AppText variant="heading">{nome}</AppText>
              {persona.username ? (
                <AppText variant="small" tone="secondary">
                  @{persona.username}
                </AppText>
              ) : null}
            </View>
            {/* La località è della **persona** (dal profilo), non dell'annuncio:
                dice dove sta chi si contatterà. Se manca, la riga non compare. */}
            {persona.localita ? (
              <AppText variant="small" tone="secondary">
                {`si trova a ${persona.localita}`}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: t.border }} />

        <View style={{ gap: space.sm }}>
          <Chip background={t.serviceBg}>
            <AppText variant="caption" style={{ color: t.serviceText }}>
              {categoria}
            </AppText>
          </Chip>
          <AppText variant="heading" numberOfLines={3}>
            {mansione}
          </AppText>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }}
          >
            {/* La località dell'**annuncio**: se manca, niente icona e niente
                trattino al suo posto. */}
            {offerta.localita ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Ionicons name="location-outline" size={14} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {offerta.localita}
                </AppText>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons
                name={offerta.daRemoto ? 'globe-outline' : 'storefront-outline'}
                size={14}
                color={t.textSecondary}
              />
              <AppText variant="small" tone="secondary">
                {etichettaModalita(offerta.daRemoto)}
              </AppText>
            </View>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: t.border }} />

        <View style={{ gap: space.xs }}>
          {motivo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="sparkles-outline" size={15} color={t.primary} />
              <AppText variant="small" style={{ color: t.primary, fontWeight: '600' }}>
                {motivo}
              </AppText>
            </View>
          ) : null}
          {cerca ? (
            <AppText variant="small" tone="secondary">
              {`Cerca: ${cerca}`}
            </AppText>
          ) : null}
          {/* Il like si **dice**, non si promette: la riga è il fatto, non
              «accettando è un match» (il match lo dichiara il backend). */}
          {candidato.tiHaScelto ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="heart" size={15} color={t.danger} />
              <AppText variant="small" style={{ color: t.danger, fontWeight: '600' }}>
                Ti ha messo like
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Chip } from './Card';
import { etichettaModalita, nomeCategoria, nomePersona } from '@/servizi/offerta-ricerca';
import { descriviMembro, membriInOrdine, versoCatena } from '@/servizi/coda';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * I membri della catena, in ordine, con **chi offre cosa a chi**.
 *
 * È l'unico posto in cui si disegna la catena: legge i versi dichiarati dal
 * backend (`offreA`) e, quando quei versi **non** ci sono, non disegna frecce e
 * non deduce niente — mostra l'ordine e lo dichiara. Le due chat della catena
 * vivono in `scambi.jsx` e usano la stessa lettura dei versi, non una copia.
 *
 * È **puro**: dati e categorie dall'esterno, nessuno stato, nessuna chiamata.
 * Ogni riga è `role="listitem"` con **una** frase accessibile (`descriviMembro`),
 * così un lettore di schermo non compone sei frammenti.
 */

/** Le iniziali per l'avatar: nome e cognome, altrimenti l'iniziale dello username. */
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

/** Il nome da mostrare: per me è «Tu», così la catena si legge dal mio punto di vista. */
function nomeMembro(membro) {
  return membro.sonoIo ? 'Tu' : nomePersona(membro.persona);
}

function RigaMembro({ membro, elenco, categorie }) {
  const t = useTokens();
  const categoria = nomeCategoria(categorie, membro.offerta.idCategoria) ?? 'Categoria non disponibile';
  const mansione = membro.offerta.mansione.trim() || 'Mansione non indicata';
  const destinatario = versoCatena(membro, elenco);
  const categoriaRicerca = membro.ricerca
    ? (nomeCategoria(categorie, membro.ricerca.idCategoria) ?? 'Categoria non disponibile')
    : null;
  const mansioneRicerca = membro.ricerca?.mansione.trim() || null;

  return (
    <View
      role="listitem"
      accessible
      accessibilityLabel={descriviMembro(membro, categorie, elenco)}
      style={{
        borderColor: t.border,
        borderWidth: 1,
        borderRadius: radius.input,
        padding: space.md,
      }}
    >
      <View aria-hidden={true} style={{ flexDirection: 'row', gap: space.md }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.pill,
            backgroundColor: t.serviceBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="small" style={{ color: t.serviceText, fontWeight: '700' }}>
            {membro.sonoIo ? 'Tu' : iniziali(membro.persona)}
          </AppText>
        </View>

        <View style={{ flex: 1, gap: space.xs }}>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}>
            <AppText style={{ fontWeight: '600' }}>{nomeMembro(membro)}</AppText>
            {!membro.sonoIo && membro.persona.username ? (
              <AppText variant="small" tone="secondary">
                @{membro.persona.username}
              </AppText>
            ) : null}
          </View>

          {membro.persona.localita ? (
            <AppText variant="small" tone="secondary">
              {`si trova a ${membro.persona.localita}`}
            </AppText>
          ) : null}

          <Chip background={t.serviceBg}>
            <AppText variant="caption" style={{ color: t.serviceText }}>
              {categoria}
            </AppText>
          </Chip>
          <AppText numberOfLines={3}>{mansione}</AppText>

          <View style={{ flexDirection: 'row', gap: space.md, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons
                name={membro.offerta.daRemoto ? 'globe-outline' : 'storefront-outline'}
                size={14}
                color={t.textSecondary}
              />
              <AppText variant="small" tone="secondary">
                {etichettaModalita(membro.offerta.daRemoto)}
              </AppText>
            </View>
            {membro.offerta.localita ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Ionicons name="location-outline" size={14} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {membro.offerta.localita}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Il verso della catena: compare **solo** se il backend l'ha dichiarato. */}
          {destinatario ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="arrow-forward-outline" size={15} color={t.primary} />
              <AppText variant="small" style={{ color: t.primary, fontWeight: '600' }}>
                {`offre a ${destinatario.sonoIo ? 'te' : nomePersona(destinatario.persona)}`}
              </AppText>
            </View>
          ) : null}

          {membro.ricerca ? (
            <AppText variant="small" tone="secondary">
              {`Cerca: ${[categoriaRicerca, mansioneRicerca].filter(Boolean).join(' · ')}`}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function ElencoMembri({ membri, categorie = [] }) {
  const elenco = membriInOrdine(membri);
  if (elenco.length === 0) {
    return null;
  }
  const conVersi = elenco.some((membro) => membro.offreA !== null);

  return (
    <View style={{ gap: space.sm }}>
      <View role="list" style={{ gap: space.sm }}>
        {elenco.map((membro) => (
          <RigaMembro key={membro.chiave} membro={membro} elenco={elenco} categorie={categorie} />
        ))}
      </View>
      {conVersi ? null : (
        <AppText variant="small" tone="secondary">
          L'ordine delle persone è quello deciso dal sistema: chi offre cosa a chi non è ancora
          stato comunicato.
        </AppText>
      )}
    </View>
  );
}

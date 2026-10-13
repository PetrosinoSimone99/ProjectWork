import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Chip } from './Card';
import { nomePersona } from '@/servizi/offerta-ricerca';
import { localitaPerDisplay } from '@/servizi/aree-italiane';
import {
  descriviPartecipante,
  etichettaDecisione,
  partecipantiInOrdine,
  versoCatena,
} from '@/servizi/catene';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * I partecipanti della catena, in ordine, con la **decisione** di ognuno e — se
 * il backend l'ha dichiarata — la freccia del verso (`links`).
 *
 * È l'unico posto in cui si disegna la catena: legge i versi dichiarati
 * (`offreAChiave`) e, quando quei versi **non** ci sono, non disegna frecce e
 * non deduce niente — mostra l'ordine e lo dichiara.
 *
 * Il contratto delle catene porta **solo gli id** dei servizi, mai la
 * descrizione (segnalazione in `temp/gruppo-2-domande/24`): le righe mostrano
 * persone, posizione e versi, e **non** inventano servizio alcuno.
 *
 * È **puro**: dati dall'esterno, nessuno stato, nessuna chiamata. Ogni riga è
 * `role="listitem"` con **una** frase accessibile (`descriviPartecipante`).
 *
 * Le decisioni altrui si **leggono** (chip «ha accettato / in attesa / ha
 * rifiutato»), mai si toccano: i pulsanti della mia decisione stanno nella
 * `CardCatena`, non qui.
 */

/** Le iniziali per l'avatar: nome e cognome, altrimenti l'iniziale dello username. */
function iniziali(persona) {
  const parti = [persona?.nome, persona?.cognome].filter(
    (parte) => typeof parte === 'string' && parte.trim() !== '',
  );
  if (parti.length > 0) {
    return parti.map((parte) => parte.trim().charAt(0).toUpperCase()).join('');
  }
  const utente = typeof persona?.username === 'string' ? persona.username.trim() : '';
  return utente ? utente.charAt(0).toUpperCase() : '?';
}

/** Il nome da mostrare: per me è «Tu», così la catena si legge dal mio punto di vista. */
function nomePartecipante(partecipante) {
  return partecipante.sonoIo ? 'Tu' : nomePersona(partecipante.persona);
}

/** I colori del chip della decisione: verde per accettato, rosso per rifiutato. */
function coloriDecisione(decisione, t) {
  if (decisione === 'ACCEPT') {
    return { background: t.serviceBg, testo: t.serviceText };
  }
  if (decisione === 'REJECT') {
    return { background: t.dangerBg, testo: t.dangerText };
  }
  return { background: t.background, testo: t.textSecondary };
}

function RigaPartecipante({ partecipante, elenco }) {
  const t = useTokens();
  const destinatario = versoCatena(partecipante, elenco);
  const colori = coloriDecisione(partecipante.decisione, t);

  return (
    <View
      role="listitem"
      accessible
      accessibilityLabel={descriviPartecipante(partecipante, elenco)}
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
            {partecipante.sonoIo ? 'Tu' : iniziali(partecipante.persona)}
          </AppText>
        </View>

        <View style={{ flex: 1, gap: space.xs }}>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}>
            <AppText style={{ fontWeight: '600' }}>{nomePartecipante(partecipante)}</AppText>
            {!partecipante.sonoIo && partecipante.persona.username ? (
              <AppText variant="small" tone="secondary">
                @{partecipante.persona.username}
              </AppText>
            ) : null}
          </View>

          {partecipante.persona.localita ? (
            <AppText variant="small" tone="secondary">
              {`si trova a ${localitaPerDisplay(partecipante.persona.localita)}`}
            </AppText>
          ) : null}

          {/* Il verso della catena: compare **solo** se il backend l'ha dichiarato. */}
          {destinatario ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="arrow-forward-outline" size={15} color={t.primary} />
              <AppText variant="small" style={{ color: t.primary, fontWeight: '600' }}>
                {`offre a ${destinatario.sonoIo ? 'te' : nomePersona(destinatario.persona)}`}
              </AppText>
            </View>
          ) : null}

          {/* La decisione: si legge, non si tocca. I pulsanti stanno nella card. */}
          <View style={{ flexDirection: 'row' }}>
            <Chip background={colori.background}>
              <AppText variant="caption" style={{ color: colori.testo }}>
                {etichettaDecisione(partecipante.decisione)}
              </AppText>
            </Chip>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ElencoMembri({ partecipanti }) {
  const elenco = partecipantiInOrdine(partecipanti);
  if (elenco.length === 0) {
    return null;
  }
  const conVersi = elenco.some((partecipante) => partecipante.offreAChiave !== null);

  return (
    <View style={{ gap: space.sm }}>
      <View role="list" style={{ gap: space.sm }}>
        {elenco.map((partecipante) => (
          <RigaPartecipante
            key={partecipante.chiave}
            partecipante={partecipante}
            elenco={elenco}
          />
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

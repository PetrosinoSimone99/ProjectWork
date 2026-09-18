import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { ottieniAccordi } from '@/api/barattolo';
import {
  accordoConcluso,
  formattaDurata,
  nomePartecipante,
  toccaAMe,
} from '@/accordi/stati';
import { useAggiornamento } from '@/hooks/useAggiornamento';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card, Chip } from '@/components/Card';
import { ChipStatoAccordo } from '@/components/ChipStatoAccordo';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { space, useTokens } from '@/theme/tokens';

/** Riga icona + testo usata per le durate dentro la card. */
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

/** Card di un accordo nell'elenco: con chi è, a che punto è, se tocca a me. */
function CardAccordo({ accordo, utenteId, onPress }) {
  const t = useTokens();
  const altro = accordo.altro;
  const nomeAltro = nomePartecipante(altro);
  const daFare = toccaAMe(accordo, utenteId);
  const miaDurata = formattaDurata(accordo.io?.durata_attivita) ?? 'non indicata';
  const suaDurata = formattaDurata(altro?.durata_attivita) ?? 'non indicata';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Apri l'accordo con ${nomeAltro}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          <ChipStatoAccordo stato={accordo.stato} />
          {daFare ? (
            <Chip background={t.primary}>
              <AppText variant="caption" style={{ color: t.onPrimary }}>
                Tocca a te
              </AppText>
            </Chip>
          ) : null}
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={t.textSecondary} />
        </View>

        <View style={{ gap: 2 }}>
          <AppText variant="heading">{nomeAltro}</AppText>
          {altro?.username ? (
            <AppText variant="small" tone="secondary">
              @{altro.username}
            </AppText>
          ) : null}
        </View>

        <RigaDato icona="time-outline" testo={`Durata: tu ${miaDurata} · ${nomeAltro} ${suaDurata}`} />
      </Card>
    </Pressable>
  );
}

/** Sezione dell'elenco: si nasconde da sola se non ha nulla da mostrare. */
function Sezione({ titolo, accordi, utenteId, onSelect }) {
  if (accordi.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: space.md }}>
      <AppText variant="caption" tone="secondary">
        {titolo} · {accordi.length}
      </AppText>
      {accordi.map((accordo) => (
        <CardAccordo
          key={accordo.id}
          accordo={accordo}
          utenteId={utenteId}
          onPress={() => onSelect(accordo)}
        />
      ))}
    </View>
  );
}

export default function AccordiScreen() {
  const router = useRouter();
  const { token, utente } = useAuth();
  const t = useTokens();
  const [accordi, setAccordi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // L'id dell'accordo viaggia come stringa nei parametri di rotta: il dettaglio
  // lo riconverte e lo valida prima di usarlo.
  const vaiAlDettaglio = useCallback(
    (accordo) =>
      router.push({ pathname: '/accordo', params: { id: String(accordo.id) } }),
    [router],
  );

  const carica = useCallback(async () => {
    if (!token || !utente) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAccordi(await ottieniAccordi(token, utente.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setLoading(false);
    }
  }, [token, utente]);

  // La lista si ricarica ogni volta che la tab torna in primo piano: al ritorno
  // dal dettaglio (dove l'altro può aver accettato o completato) i dati devono
  // essere quelli veri, non quelli di prima.
  useFocusEffect(
    useCallback(() => {
      void carica();
    }, [carica]),
  );

  const { refreshing, onRefresh } = useAggiornamento(carica);
  const utenteId = utente?.id;
  const lista = accordi ?? [];

  const daFare = lista.filter((accordo) => toccaAMe(accordo, utenteId));
  const inCorso = lista.filter(
    (accordo) => !toccaAMe(accordo, utenteId) && !accordoConcluso(accordo.stato),
  );
  const conclusi = lista.filter((accordo) => accordoConcluso(accordo.stato));

  // Spinner a schermo pieno solo al primo caricamento: i ricarichi successivi
  // (focus della tab, pull-to-refresh) lasciano il contenuto a schermo.
  if (loading && accordi === null) {
    return <LoadingScreen label="Carico i tuoi accordi…" />;
  }

  // Un ricarico su una lista già a schermo non deve far sparire il contenuto:
  // lo dice un indicatore piccolo, non una schermata di caricamento.
  const ricaricoInCorso = loading && accordi !== null;

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Accordi</AppText>
        <AppText variant="small" tone="secondary">
          Scambi di servizi 1:1: si propongono dal dettaglio di un annuncio o da una chat.
        </AppText>
      </View>

      {error ? (
        <>
          <Banner kind="error" message={error} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void carica()}
          />
        </>
      ) : null}

      {lista.length === 0 ? (
        // Con un errore a schermo lo stato vuoto sarebbe fuorviante: c'è il Banner.
        error ? null : (
          <EmptyState
            icon="swap-horizontal-outline"
            title="Non hai accordi"
            description="Proponine uno dal dettaglio di un annuncio o dalla chat: qui poi segui l'intero ciclo, dall'accettazione alla conclusione."
          />
        )
      ) : (
        <View style={{ gap: space.xl }}>
          <Sezione
            titolo="Tocca a te"
            accordi={daFare}
            utenteId={utenteId}
            onSelect={vaiAlDettaglio}
          />
          <Sezione
            titolo="In corso"
            accordi={inCorso}
            utenteId={utenteId}
            onSelect={vaiAlDettaglio}
          />
          <Sezione
            titolo="Conclusi"
            accordi={conclusi}
            utenteId={utenteId}
            onSelect={vaiAlDettaglio}
          />
        </View>
      )}

      {ricaricoInCorso ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : null}
    </Screen>
  );
}

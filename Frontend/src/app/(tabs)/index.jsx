import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { ricerca, ricercaHomepage } from '@/api/barattolo';
import { useAggiornamento } from '@/hooks/useAggiornamento';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Card, Chip } from '@/components/Card';
import { Banner } from '@/components/Banner';
import { EmptyState } from '@/components/EmptyState';
import { radius, space, useTokens } from '@/theme/tokens';

/** Card risultato: badge tipo, tariffa in crediti, autore e località. Cliccabile. */
function ResultCard({ item, onPress }) {
  const t = useTokens();
  const isService = item.tipo === 'SERVIZIO_PROFILO';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Apri dettaglio: ${item.titolo}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            background={isService ? t.serviceBg : t.creditBg}
            color={isService ? t.serviceText : t.creditText}
          >
            <AppText variant="caption" style={{ color: isService ? t.serviceText : t.creditText }}>
              {isService ? 'Servizio' : 'Richiesta'}
            </AppText>
          </Chip>
          {item.tariffa_oraria_crediti !== null ? (
            <Chip background={t.creditBg} color={t.creditText}>
              <Ionicons name="wallet-outline" size={12} color={t.creditText} />
              <AppText variant="caption" style={{ color: t.creditText }}>
                {item.tariffa_oraria_crediti} crediti/h
              </AppText>
            </Chip>
          ) : null}
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={16} color={t.textSecondary} />
        </View>

        <View style={{ gap: space.xs }}>
          <AppText variant="heading">{item.titolo}</AppText>
          <AppText tone="secondary" numberOfLines={2}>
            {item.descrizione}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Ionicons name="person-outline" size={14} color={t.textSecondary} />
            <AppText variant="small" tone="secondary">
              {item.nome} {item.cognome}
            </AppText>
          </View>
          {item.localita ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="location-outline" size={14} color={t.textSecondary} />
              <AppText variant="small" tone="secondary">
                {item.localita}
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

function SectionList({ title, items, onSelect }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: space.md }}>
      <AppText variant="caption" tone="secondary">
        {title} · {items.length}
      </AppText>
      {items.map((item, index) => (
        <ResultCard
          // ricerca.php non restituisce l'id della richiesta (fix backend in corso):
          // senza l'indice, due annunci omonimi dello stesso utente colliderebbero.
          key={`${item.tipo}-${item.utente_id}-${item.titolo}-${index}`}
          item={item}
          onPress={() => onSelect(item)}
        />
      ))}
    </View>
  );
}

/** Dettaglio annuncio: apre i dati completi del risultato selezionato. */
function DetailModal({ item, onClose, utente }) {
  const router = useRouter();
  const t = useTokens();
  const isService = item?.tipo === 'SERVIZIO_PROFILO';
  const isOwnAnnouncement = item && utente && Number(item.utente_id) === Number(utente.id);

  return (
    <Modal visible={item !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          padding: space.lg,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chiudi dettaglio"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 0,
          }}
          onPress={onClose}
        />
        {item ? (
          <Card style={{ gap: space.md, position: 'relative', zIndex: 1 }}>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                background={isService ? t.serviceBg : t.creditBg}
                color={isService ? t.serviceText : t.creditText}
              >
                <AppText
                  variant="caption"
                  style={{ color: isService ? t.serviceText : t.creditText }}
                >
                  {isService ? 'Servizio offerto' : 'Richiesta'}
                </AppText>
              </Chip>
              {item.tariffa_oraria_crediti !== null ? (
                <Chip background={t.creditBg} color={t.creditText}>
                  <Ionicons name="wallet-outline" size={12} color={t.creditText} />
                  <AppText variant="caption" style={{ color: t.creditText }}>
                    {item.tariffa_oraria_crediti} crediti/h
                  </AppText>
                </Chip>
              ) : null}
              {item.durata_minuti !== null ? (
                <Chip background={t.serviceBg} color={t.serviceText}>
                  <Ionicons name="time-outline" size={12} color={t.serviceText} />
                  <AppText variant="caption" style={{ color: t.serviceText }}>
                    {item.durata_minuti} min
                  </AppText>
                </Chip>
              ) : null}
            </View>

            <View style={{ gap: space.xs }}>
              <AppText variant="heading">{item.titolo}</AppText>
              <AppText tone="secondary">{item.descrizione}</AppText>
            </View>

            <View style={{ gap: space.xs }}>
              <AppText variant="small" tone="secondary">
                Pubblicato da
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Ionicons name="person-circle-outline" size={18} color={t.textSecondary} />
                <AppText>
                  {item.nome} {item.cognome}
                </AppText>
                <AppText variant="small" tone="secondary">
                  @{item.username}
                </AppText>
              </View>
              {item.localita ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Ionicons name="location-outline" size={16} color={t.textSecondary} />
                  <AppText tone="secondary">{item.localita}</AppText>
                </View>
              ) : null}
            </View>

            {isOwnAnnouncement ? (
              <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
                È il tuo annuncio.
              </AppText>
            ) : (
              <AppButton
                label={`Contatta ${item.nome}`}
                icon="chatbubble-ellipses-outline"
                onPress={() => {
                  onClose();
                  router.push({
                    pathname: '/chat',
                    params: {
                      utenteId: String(item.utente_id),
                      nome: item.nome,
                      cognome: item.cognome,
                      username: item.username,
                      titolo: item.titolo,
                    },
                  });
                }}
              />
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chiudi dettaglio annuncio"
              onPress={onClose}
              style={({ pressed }) => ({
                alignSelf: 'flex-end',
                backgroundColor: pressed ? t.primaryPressed : t.primary,
                borderRadius: radius.pill,
                paddingHorizontal: space.lg,
                paddingVertical: space.sm,
              })}
            >
              <AppText style={{ color: t.onPrimary, fontWeight: '700' }}>Chiudi</AppText>
            </Pressable>
          </Card>
        ) : null}
      </View>
    </Modal>
  );
}

export default function SearchScreen() {
  const { token, utente } = useAuth();
  const t = useTokens();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [searchedFor, setSearchedFor] = useState('');
  const [detail, setDetail] = useState(null);

  // Incrementato a ogni nuova richiesta (ricerca, mostra-tutto, ricarica della home):
  // una risposta che arriva quando è già partita una richiesta più recente viene
  // ignorata, così una ricerca lenta non può sovrascrivere i risultati di quella dopo.
  const requestSeqRef = useRef(0);

  // Ultimo termine mostrato (parallelo a "searchedFor", ma letto dentro gli effetti
  // senza innescarne i re-run: serve alla logica di ricarica al focus della tab).
  const searchedForRef = useRef('');

  const eseguiRicerca = useCallback(
    async (fn, searchedTerm) => {
      if (!token) {
        return;
      }
      const seq = ++requestSeqRef.current;
      setLoading(true);
      setError(null);
      try {
        const response = await fn();
        if (seq !== requestSeqRef.current) {
          return; // richiesta superata: la risposta è stale, non aggiornare la UI.
        }
        setResults(response.risultati);
        setSearchedFor(searchedTerm);
        searchedForRef.current = searchedTerm;
      } catch (err) {
        if (seq !== requestSeqRef.current) {
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
        setResults(null);
        setSearchedFor(''); // niente "nessun risultato per <termine vecchio>" incoerente.
        searchedForRef.current = '';
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [token],
  );

  const carica = useCallback(
    (term) => eseguiRicerca(() => ricerca(token, term), term),
    [eseguiRicerca, token],
  );

  // La home mostra gli annunci attivi (ricercaHomepage.php, GET senza parole
  // chiave) all'apertura E ogni volta che la tab torna in primo piano: resta così
  // aggiornata anche dopo una pubblicazione nella tab Richieste.
  // La ricarica è saltata mentre l'utente sta guardando i risultati di una ricerca
  // (searchedForRef non vuoto): non devono sparire sotto gli annunci della home.
  // Il ref (e non lo stato) evita che il cambio di searchedFor inneschi un doppio
  // fetch insieme a quello del pulsante X.
  useFocusEffect(
    useCallback(() => {
      if (searchedForRef.current !== '') {
        return undefined;
      }
      void eseguiRicerca(() => ricercaHomepage(token), '');
      return () => {
        // Fuori dal focus la risposta in volo non deve applicarsi alla UI.
        requestSeqRef.current += 1;
      };
    }, [eseguiRicerca, token]),
  );

  // Ricarica gli annunci della home (usato dal pulsante X): il backend
  // ricerca.php pretende una parola, quindi "mostra tutto" passa dal suo
  // endpoint dedicato, non da una ricerca vuota.
  const mostraTutto = useCallback(
    () => eseguiRicerca(() => ricercaHomepage(token), ''),
    [eseguiRicerca, token],
  );

  // Pull-to-refresh: ripete quello che c'è a schermo, senza scartare il contesto
  // dell'utente — se sta guardando i risultati di una ricerca rilancia quella
  // ricerca, altrimenti ricarica gli annunci della home.
  const aggiorna = useCallback(() => {
    const term = searchedForRef.current;
    return term === ''
      ? eseguiRicerca(() => ricercaHomepage(token), '')
      : eseguiRicerca(() => ricerca(token, term), term);
  }, [eseguiRicerca, token]);

  const { refreshing, onRefresh } = useAggiornamento(aggiorna);

  function handleSearch() {
    const term = query.trim();
    if (!term) {
      void mostraTutto();
      return;
    }
    void carica(term);
  }

  // ricercaHomepage.php non restituisce (ancora) il campo "tipo", a differenza
  // di ricerca.php: senza questo fallback gli annunci della home non entrano in
  // nessuna delle due sezioni e la schermata resta vuota. Trattiamo come
  // richiesta tutto ciò che non è esplicitamente un servizio di profilo, così
  // un tipo assente o sconosciuto non fa sparire le card.
  const services = results?.filter((item) => item.tipo === 'SERVIZIO_PROFILO') ?? [];
  const requests = results?.filter((item) => item.tipo !== 'SERVIZIO_PROFILO') ?? [];
  const titoloHome = results === null || results.length === 0 ? 'Cerca' : 'Annunci';

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <DetailModal item={detail} onClose={() => setDetail(null)} utente={utente} />

      <View style={{ gap: space.xs }}>
        <AppText variant="title">{titoloHome}</AppText>
        <AppText variant="small" tone="secondary">
          {results === null || results.length === 0
            ? 'Una parola trova insieme i servizi offerti e le richieste pubblicate.'
            : 'Tutti gli annunci attivi della comunità: un tocco apre il dettaglio.'}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: t.surface,
            borderColor: t.border,
            borderWidth: 1,
            borderRadius: radius.pill,
            paddingHorizontal: space.lg,
          }}
        >
          <TextInput
            style={{ flex: 1, minHeight: 50, fontSize: 15, color: t.text }}
            value={query}
            onChangeText={setQuery}
            placeholder="es. ripetizioni, giardinaggio…"
            placeholderTextColor={t.textSecondary}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancella ricerca e mostra tutti gli annunci"
              onPress={() => {
                setQuery('');
                void mostraTutto();
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={t.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Avvia la ricerca"
          onPress={handleSearch}
          disabled={loading}
          style={({ pressed }) => ({
            width: 50,
            height: 50,
            borderRadius: radius.pill,
            backgroundColor: loading ? t.border : pressed ? t.primaryPressed : t.primary,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          {loading ? (
            <ActivityIndicator color={t.onPrimary} />
          ) : (
            <Ionicons name="search" size={20} color={t.onPrimary} />
          )}
        </Pressable>
      </View>

      {error ? <Banner kind="error" message={error} /> : null}

      {/* Spinner a schermo pieno solo quando non c'è ancora nulla da mostrare:
          i ricarichi al focus / le nuove ricerche tengono visibile l'ultimo contenuto. */}
      {loading && results === null ? (
        <View style={{ alignItems: 'center', paddingVertical: space.xxl, gap: space.md }}>
          <ActivityIndicator size="large" color={t.primary} />
          <AppText variant="small" tone="secondary">
            Sto cercando…
          </AppText>
        </View>
      ) : results === null ? (
        <EmptyState
          icon="search-outline"
          title="Cerca qualcosa"
          description="Prova con una parola chiave: matematica, giardinaggio, Firenze…"
        />
      ) : results.length === 0 ? (
        searchedFor === '' ? (
          <EmptyState
            icon="leaf-outline"
            title="Nessun annuncio attivo"
            description="Quando qualcuno pubblica una richiesta, la troverai qui."
          />
        ) : (
          <EmptyState
            icon="leaf-outline"
            title={`Nessun risultato per “${searchedFor}”`}
            description="Prova con un'altra parola o con un termine più generico."
          />
        )
      ) : (
        <View style={{ gap: space.xl }}>
          <SectionList title="Servizi offerti" items={services} onSelect={setDetail} />
          <SectionList title="Richieste" items={requests} onSelect={setDetail} />
        </View>
      )}
    </Screen>
  );
}

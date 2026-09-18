import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { ChatComposer } from '@/components/ChatComposer';
import { EmptyState } from '@/components/EmptyState';
import { MessageBubble } from '@/components/MessageBubble';
import { Screen } from '@/components/Screen';
import { useChat } from '@/hooks/useChat';
import { radius, space, useTokens } from '@/theme/tokens';

function readParam(value) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

/**
 * La chat 1:1 con un'altra persona.
 *
 * La schermata **disegna**: intestazione con l'interlocutore e il pulsante
 * «Accordo», i quattro stati (caricamento, errore, vuoto, elenco), la barra di
 * scrittura e lo scorrimento. La rete sta in `useChat`, le bolle in
 * `MessageBubble`, il composer in `ChatComposer`.
 *
 * Nota sui nomi: l'interlocutore arriva dai parametri della rotta, non dal
 * server, quindi entrando da un collegamento diretto la testata non sa chi sia
 * (P39, lato backend: `ottieniStoricoChat.php` non restituisce i nomi).
 */
export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, utente } = useAuth();
  const t = useTokens();
  const flatListRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const [draft, setDraft] = useState('');

  const targetUserId = Number(readParam(params.utenteId));
  const targetName = readParam(params.nome);
  const targetSurname = readParam(params.cognome);
  const targetUsername = readParam(params.username);
  const announcementTitle = readParam(params.titolo);
  const displayName = `${targetName} ${targetSurname}`.trim() || targetUsername || 'Chat';
  const initials = `${targetName.charAt(0)}${targetSurname.charAt(0)}`.toUpperCase() || '?';
  const currentUserId = Number(utente?.id);
  const hasValidTarget = Number.isInteger(targetUserId) && targetUserId > 0;

  const { chatId, messages, loading, error, sending, lastMessageId, invia, riprova } = useChat({
    token,
    utente,
    targetUserId,
    hasValidTarget,
  });

  // Si scorre **solo** quando cambia l'ultimo messaggio: un nuovo render per
  // qualsiasi altro motivo non deve strappare la lettura a chi sta risalendo lo
  // storico. Il confronto è con l'id, non con la lunghezza dell'elenco.
  useEffect(() => {
    if (lastMessageId === null || lastMessageId === lastMessageIdRef.current) {
      return undefined;
    }
    lastMessageIdRef.current = lastMessageId;

    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [lastMessageId]);

  // L'invio è dell'hook; qui resta solo il testo digitato, che è stato locale
  // dell'interfaccia: si svuota quando il messaggio è partito davvero.
  const handleSend = useCallback(async () => {
    const inviato = await invia(draft);
    if (inviato) {
      setDraft('');
    }
  }, [draft, invia]);

  const renderMessage = useCallback(
    ({ item }) => (
      <MessageBubble message={item} isOwn={Number(item.id_utente) === currentUserId} />
    ),
    [currentUserId],
  );

  function renderEmptyState() {
    if (loading) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
          <ActivityIndicator size="large" color={t.primary} />
          <AppText variant="small" tone="secondary">
            Caricamento chat…
          </AppText>
        </View>
      );
    }
    if (error) {
      return null;
    }
    return (
      <EmptyState
        icon="chatbubble-ellipses-outline"
        title="Nessun messaggio"
        description="Scrivi tu il primo messaggio per iniziare la conversazione."
      />
    );
  }

  if (!token || !utente) {
    return <Redirect href="/login" />;
  }

  // La chat è fuori dalla barra tab: il margine inferiore di sicurezza (home
  // indicator su iPhone) lo applica Screen con withBottomInset di default.
  // bottomSpacing ridotto (8 invece di 16): la barra di invio poggia sul bordo
  // dello schermo, con lo spazio pieno sembrava troppo staccata dal fondo.
  return (
    <Screen bottomSpacing={space.sm}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Torna indietro"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: radius.pill,
            backgroundColor: pressed ? t.border : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </Pressable>

        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            backgroundColor: t.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="small" tone="onPrimary" style={{ fontWeight: '700' }}>
            {initials}
          </AppText>
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <AppText variant="heading" numberOfLines={1}>
            {displayName}
          </AppText>
          {targetUsername ? (
            <AppText variant="small" tone="secondary" numberOfLines={1}>
              @{targetUsername}
            </AppText>
          ) : null}
          {announcementTitle ? (
            <AppText variant="small" tone="secondary" numberOfLines={1}>
              {announcementTitle}
            </AppText>
          ) : null}
        </View>

        {/* La proposta di accordo parte da qui, con l'id del destinatario che la
            chat già conosce: il backend non offre un elenco di utenti. */}
        {hasValidTarget ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Proponi un accordo con questa persona"
            onPress={() =>
              router.push({
                pathname: '/nuovo-accordo',
                params: {
                  id: String(targetUserId),
                  nome: displayName,
                  username: targetUsername,
                },
              })
            }
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xs,
              height: 36,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: t.border,
              paddingHorizontal: space.md,
              backgroundColor: pressed ? t.border : 'transparent',
            })}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={t.primary} />
            <AppText variant="small" style={{ fontWeight: '600', color: t.primary }}>
              Accordo
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {error ? <Banner kind="error" message={error} /> : null}
      {error ? (
        <AppButton label="Riprova" variant="secondary" icon="refresh-outline" onPress={riprova} />
      ) : null}

      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(message) => String(message.id)}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={messages.length === 0 ? { flexGrow: 1 } : { paddingVertical: space.sm }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <ChatComposer
        value={draft}
        onChangeText={setDraft}
        onSend={handleSend}
        sending={sending}
        disabled={chatId === null}
      />
    </Screen>
  );
}

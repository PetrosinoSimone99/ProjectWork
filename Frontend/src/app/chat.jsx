import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import {
  cercaOCreaChat,
  inviaMessaggio,
  ottieniStoricoChat,
} from '@/api/barattolo';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Banner } from '@/components/Banner';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { radius, space, useTokens } from '@/theme/tokens';

const POLLING_INTERVAL_MS = 4000;

function readParam(value) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getErrorMessage(error) {
  return error instanceof ApiError ? error.message : 'Errore imprevisto. Riprova.';
}

function MessageBubble({ message, isOwn }) {
  const t = useTokens();
  const createdAt = formatMessageTime(message.data_creazione);

  return (
    <View style={{ alignItems: isOwn ? 'flex-end' : 'flex-start', marginBottom: space.sm }}>
      <View
        style={{
          maxWidth: '78%',
          backgroundColor: isOwn ? t.primary : t.surface,
          borderColor: isOwn ? t.primary : t.border,
          borderWidth: isOwn ? 0 : 1,
          borderRadius: radius.input,
          borderBottomRightRadius: isOwn ? space.xs : radius.input,
          borderBottomLeftRadius: isOwn ? radius.input : space.xs,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
        }}
      >
        <AppText
          style={{ color: isOwn ? t.onPrimary : t.text, flexShrink: 1 }}
        >
          {message.messaggio}
        </AppText>
        {createdAt ? (
          <AppText
            variant="small"
            style={{ color: isOwn ? t.onPrimary : t.textSecondary, opacity: 0.8, alignSelf: 'flex-end' }}
          >
            {createdAt}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function formatMessageTime(value) {
  if (typeof value !== 'string' || value.length < 16) {
    return '';
  }

  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, utente } = useAuth();
  const t = useTokens();
  const flatListRef = useRef(null);
  const mountedRef = useRef(true);
  const lastMessageIdRef = useRef(null);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const targetUserId = Number(readParam(params.utenteId));
  const targetName = readParam(params.nome);
  const targetSurname = readParam(params.cognome);
  const targetUsername = readParam(params.username);
  const announcementTitle = readParam(params.titolo);
  const displayName = `${targetName} ${targetSurname}`.trim() || targetUsername || 'Chat';
  const initials = `${targetName.charAt(0)}${targetSurname.charAt(0)}`.toUpperCase() || '?';
  const currentUserId = Number(utente?.id);
  const hasValidTarget = Number.isInteger(targetUserId) && targetUserId > 0;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadChat() {
      setChatId(null);
      setMessages([]);
      lastMessageIdRef.current = null;
      setError(null);

      if (!hasValidTarget) {
        setLoading(false);
        setError('Destinatario non valido. Riapri la chat dal dettaglio di un annuncio.');
        return;
      }
      if (!token || !utente) {
        setLoading(false);
        setError('Sessione non disponibile. Torna al login e riprova.');
        return;
      }

      setLoading(true);
      try {
        const nextChatId = await cercaOCreaChat(token, utente.id, targetUserId);
        if (cancelled) {
          return;
        }
        if (!Number.isInteger(nextChatId) || nextChatId <= 0) {
          throw new ApiError(200, 'Risposta non valida dal server della chat.');
        }

        const history = await ottieniStoricoChat(token, nextChatId);
        if (cancelled) {
          return;
        }
        if (!Array.isArray(history)) {
          throw new ApiError(200, 'Storico chat non valido.');
        }

        setChatId(nextChatId);
        setMessages(history);
      } catch (loadError) {
        if (!cancelled) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadChat();
    return () => {
      cancelled = true;
    };
  }, [hasValidTarget, retryCount, targetUserId, token, utente]);

  const refresh = useCallback(async () => {
    if (!token || chatId === null) {
      return;
    }

    try {
      const history = await ottieniStoricoChat(token, chatId);
      if (!Array.isArray(history)) {
        throw new ApiError(200, 'Storico chat non valido.');
      }
      if (mountedRef.current) {
        setMessages(history);
        setError(null);
      }
    } catch (refreshError) {
      if (mountedRef.current) {
        setError(getErrorMessage(refreshError));
      }
    }
  }, [chatId, token]);

  // Polling solo ad app visibile: in background o tab nascosta non si consuma
  // rete né batteria (uno sguardo a AppState a ogni tick costa pochissimo).
  useEffect(() => {
    if (chatId === null) {
      return undefined;
    }

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        void refresh();
      }
    }, POLLING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [chatId, refresh]);

  // Appena l'app torna in primo piano ci si sincronizza subito, senza aspettare
  // il prossimo tick del timer.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && chatId !== null) {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [chatId, refresh]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const lastMessageId = messages[messages.length - 1]?.id;
    if (lastMessageId === lastMessageIdRef.current) {
      return;
    }
    lastMessageIdRef.current = lastMessageId;

    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 0);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || chatId === null || !token || !utente || sending) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      await inviaMessaggio(token, chatId, utente.id, text);
      if (!mountedRef.current) {
        return;
      }
      setDraft('');
      await refresh();
    } catch (sendError) {
      if (mountedRef.current) {
        setError(getErrorMessage(sendError));
      }
    } finally {
      if (mountedRef.current) {
        setSending(false);
      }
    }
  }, [chatId, draft, refresh, sending, token, utente]);

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

  const canSend = Boolean(draft.trim()) && chatId !== null && !sending;

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
      </View>

      {error ? <Banner kind="error" message={error} /> : null}
      {error ? (
        <AppButton
          label="Riprova"
          variant="secondary"
          icon="refresh-outline"
          onPress={() => setRetryCount((count) => count + 1)}
        />
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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View
          style={{
            flex: 1,
            minHeight: 50,
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
            style={{ flex: 1, minHeight: 48, fontSize: 15, color: t.text }}
            value={draft}
            onChangeText={setDraft}
            placeholder="Scrivi un messaggio…"
            placeholderTextColor={t.textSecondary}
            onSubmitEditing={() => void handleSend()}
            returnKeyType="send"
            autoCapitalize="sentences"
            editable={chatId !== null && !sending}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Invia messaggio"
          accessibilityState={{ disabled: !canSend, busy: sending }}
          disabled={!canSend}
          onPress={() => void handleSend()}
          style={({ pressed }) => ({
            width: 50,
            height: 50,
            borderRadius: radius.pill,
            backgroundColor: !canSend ? t.border : pressed ? t.primaryPressed : t.primary,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          {sending ? (
            <ActivityIndicator color={t.onPrimary} />
          ) : (
            <Ionicons name="send" size={19} color={canSend ? t.onPrimary : t.textSecondary} />
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

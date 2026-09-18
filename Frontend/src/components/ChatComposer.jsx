import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * La barra di scrittura della chat: il campo, il pulsante di invio e i suoi stati
 * (invio in volo, campo vuoto, chat non ancora aperta). **Non conosce la rete**:
 * consegna il testo (`onSend`) e non decide cosa farne.
 *
 * `disabled` significa «non c'è ancora una chat su cui scrivere», cioè il primo
 * caricamento: il pulsante si spegne invece da sé, quando il campo è vuoto o un
 * invio è già in volo, così il chiamante non deve ricalcolare `canSend` e non
 * può dimenticarsene.
 */
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  sending = false,
  disabled = false,
}) {
  const t = useTokens();
  const canSend = Boolean(value.trim()) && !disabled && !sending;
  const editable = !disabled && !sending;

  return (
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
          value={value}
          onChangeText={onChangeText}
          placeholder="Scrivi un messaggio…"
          placeholderTextColor={t.textSecondary}
          onSubmitEditing={() => void onSend()}
          returnKeyType="send"
          autoCapitalize="sentences"
          editable={editable}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Invia messaggio"
        accessibilityState={{ disabled: !canSend, busy: sending }}
        disabled={!canSend}
        onPress={() => void onSend()}
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
  );
}

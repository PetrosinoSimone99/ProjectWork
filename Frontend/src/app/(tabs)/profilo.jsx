import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { formatOrarioScadenza, tokenExpiresAt } from '@/auth/token-store';
import { useAggiornamento } from '@/hooks/useAggiornamento';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { ThemeSelector } from '@/components/ThemeSelector';
import { space, useTokens } from '@/theme/tokens';

export default function ProfiloScreen() {
  const { utente, token, signOut, ricaricaSessione } = useAuth();
  const router = useRouter();
  const t = useTokens();
  const [signingOut, setSigningOut] = useState(false);

  // Pull-to-refresh: rilegge la sessione salvata. La schermata non ha altri dati
  // del server da ricaricare (il backend non espone ancora l'endpoint profilo),
  // ma così la scadenza mostrata e i dati utente non restano vecchi.
  const { refreshing, onRefresh } = useAggiornamento(ricaricaSessione);

  if (!utente) {
    return null;
  }

  // La sessione salvata può avere utente incompleto (storage vecchio o payload
  // backend cambiato): nome/cognome mancanti non devono far crashare la schermata.
  const initials =
    `${utente.nome?.charAt(0) ?? ''}${utente.cognome?.charAt(0) ?? ''}`.toUpperCase() || '?';
  const displayName =
    [utente.nome, utente.cognome].filter(Boolean).join(' ') || utente.username || 'Utente';
  const expiresAt = token ? tokenExpiresAt(token) : null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.md }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 999,
            backgroundColor: t.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="title" tone="onPrimary" style={{ fontSize: 30 }}>
            {initials}
          </AppText>
        </View>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <AppText variant="title" style={{ fontSize: 22 }}>
            {displayName}
          </AppText>
          {utente.username ? (
            <AppText variant="small" tone="secondary">
              @{utente.username}
            </AppText>
          ) : null}
        </View>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="time-outline" size={18} color={t.textSecondary} />
          <AppText variant="small" tone="secondary">
            {expiresAt
              ? `Sessione valida fino alle ${formatOrarioScadenza(expiresAt * 1000)}`
              : 'Scadenza della sessione non disponibile.'}
          </AppText>
        </View>
        <AppText variant="small" tone="secondary">
          Il profilo completo (la tua offerta, la tua ricerca e i tuoi token) sarà visibile
          quando il backend esporrà l'endpoint dedicato.
        </AppText>
      </Card>

      {/* Gli inviti non sono più una tab: si aprono da qui come rotta a sé. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Apri la schermata Inviti"
        onPress={() => router.push('/inviti')}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Ionicons name="ticket-outline" size={20} color={t.primary} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" style={{ fontSize: 16 }}>
              Inviti
            </AppText>
            <AppText variant="small" tone="secondary">
              Genera il tuo codice del mese o riscatta quello di un amico.
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textSecondary} />
        </Card>
      </Pressable>

      <Card>
        <View style={{ gap: space.xs }}>
          <AppText variant="heading">Aspetto</AppText>
          <AppText variant="small" tone="secondary">
            L'opzione Sistema segue il tema del dispositivo. La scelta resta salvata su questo
            dispositivo.
          </AppText>
        </View>
        <ThemeSelector />
      </Card>

      <AppButton
        label="Esci"
        variant="danger"
        onPress={handleSignOut}
        loading={signingOut}
        icon="log-out-outline"
      />
    </Screen>
  );
}

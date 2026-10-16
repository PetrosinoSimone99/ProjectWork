import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { ROTTE_TAB } from '@/navigazione/rotte-tab';
import { useTokens } from '@/theme/tokens';

export default function TabsLayout() {
  const t = useTokens();
  const { utente } = useAuth();

  // Sull web gli URL sono navigabili direttamente: senza token si torna al login.
  if (!utente) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      // Sul web non c'è barra in basso: la navigazione è il pallino + la tendina
      // di `MenuNavigazioneWeb`, montato in `app/_layout.jsx` su ogni schermata
      // con sessione (le rotte secondarie comprese). La `tabBar` su web rende
      // quindi niente; da nativo resta `undefined` e la barra è quella di sempre.
      tabBar={Platform.OS === 'web' ? () => null : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {/* Titoli e icone arrivano da ROTTE_TAB: la stessa lista del menu del web,
          così barra e tendina non possono divergere. */}
      {ROTTE_TAB.map((rotta) => (
        <Tabs.Screen
          key={rotta.name}
          name={rotta.name}
          options={{
            title: rotta.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={rotta.icona} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

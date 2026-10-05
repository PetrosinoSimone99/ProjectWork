import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { layout, useTokens } from '@/theme/tokens';

export default function TabsLayout() {
  const t = useTokens();
  const { utente } = useAuth();

  // Sull web gli URL sono navigabili direttamente: senza token si torna al login.
  if (!utente) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.border,
          // Sul web la barra di default è troppo bassa e tronca le etichette,
          // e su schermi larghi corre per tutta la finestra: resta una barra
          // stretta e centrata, come il contenuto delle schermate.
          ...(Platform.OS === 'web'
            ? { height: 64, paddingTop: 6, width: '100%', maxWidth: layout.maxTab, alignSelf: 'center' }
            : {}),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Servizi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="loop"
        options={{
          title: 'Loop',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sync-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="offro-e-cerco"
        options={{
          title: 'Offro e cerco',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="accordi"
        options={{
          title: 'Accordi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profilo"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

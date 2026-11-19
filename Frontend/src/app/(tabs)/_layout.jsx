import { Redirect, Tabs, usePathname } from 'expo-router';
import { AppIcon } from '@/components/AppIcon';
import { Platform } from 'react-native';
import { useAuth } from '@/auth/auth-context';
import { TAB_ROUTES } from '@/navigation/tab-routes';
import { useTokens } from '@/theme/tokens';

export default function TabsLayout() {
  const t = useTokens();
  const { utente } = useAuth();
  const percorso = usePathname();

  // Sull web gli URL sono navigabili direttamente: senza token si torna al login.
  // `ritorno` porta con sé la rotta che si stava guardando, così una scadenza a
  // metà lavoro non fa ripartire dalla home (audit 2026-11-18, P1-1).
  if (!utente) {
    return <Redirect href={{ pathname: '/login', params: { ritorno: percorso } }} />;
  }

  return (
    <Tabs
      // Sul web non c'è barra in basso: la navigazione è il pallino + la tendina
      // di `WebNavMenu`, montato in `app/_layout.jsx` su ogni schermata
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
        // Niente misura fissa sull'etichetta della barra: a scala testo 200%
        // una dimensione in pixel la taglia invece di lasciarla crescere
        // (WCAG 1.4.4). Il peso resta, perché è la gerarchia e non la misura.
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      {/* Titoli e icone arrivano da TAB_ROUTES: la stessa lista del menu del web,
          così barra e tendina non possono divergere. */}
      {TAB_ROUTES.map((rotta) => (
        <Tabs.Screen
          key={rotta.name}
          name={rotta.name}
          options={{
            title: rotta.title,
            tabBarIcon: ({ color, size }) => (
              <AppIcon name={rotta.icona} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

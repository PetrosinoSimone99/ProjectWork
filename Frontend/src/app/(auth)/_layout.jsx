import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth/auth-context';

export default function AuthLayout() {
  const { utente } = useAuth();

  // Chi ha già una sessione attiva non deve restare sulle schermate di accesso.
  if (utente) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

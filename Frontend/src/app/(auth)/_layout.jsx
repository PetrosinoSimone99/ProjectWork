import { Stack } from 'expo-router';

/**
 * Le schermate di accesso: nessun redirect qui.
 *
 * Il passaggio dopo l'accesso ha **un solo** proprietario, `login.jsx`, che
 * riporta l'utente sulla strada da cui era stato buttato fuori (`ritorno`).
 * Prima anche questo layout reindirizzava a `/` appena `utente` diventava
 * valorizzato, e vinceva chi arrivava secondo: il percorso di ritorno di F26
 * sopravviveva solo per un caso di tempi di render (audit F58).
 *
 * Il gruppo lo monta o lo smonta `app/_layout.jsx` in base alla sessione, quindi
 * qui non serve guardare `utente`.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

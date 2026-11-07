/**
 * Le cinque rotte della barra delle tab: unica fonte di nomi, indirizzi,
 * titoli e icone.
 *
 * La usano **entrambi** i consumatori: `(tabs)/_layout.jsx` costruisce le
 * `Tabs.Screen` della barra nativa e `WebNavMenu` (il menu del web) le
 * voci della tendina. Scritti qui una volta sola, titoli e icone non possono
 * divergere fra barra e menu.
 *
 * `name` è il nome del file in `app/(tabs)/` (expo-router), `path` l'indirizzo
 * completo che compare nel browser: `/` per l'indice, `/<name>` per le altre.
 */
export const TAB_ROUTES = [
  { name: 'index', path: '/', title: 'Servizi', icona: 'home-outline' },
  { name: 'match', path: '/match', title: 'Match', icona: 'git-compare-outline' },
  {
    name: 'offer-and-request',
    path: '/offer-and-request',
    title: 'Offro e cerco',
    icona: 'add-circle-outline',
  },
  { name: 'agreements', path: '/agreements', title: 'Accordi', icona: 'swap-horizontal-outline' },
  { name: 'profile', path: '/profile', title: 'Profilo', icona: 'person-outline' },
];

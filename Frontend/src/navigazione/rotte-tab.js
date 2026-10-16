/**
 * Le cinque rotte della barra delle tab: unica fonte di nomi, indirizzi,
 * titoli e icone.
 *
 * La usano **entrambi** i consumatori: `(tabs)/_layout.jsx` costruisce le
 * `Tabs.Screen` della barra nativa e `MenuNavigazioneWeb` (il menu del web) le
 * voci della tendina. Scritti qui una volta sola, titoli e icone non possono
 * divergere fra barra e menu.
 *
 * `name` è il nome del file in `app/(tabs)/` (expo-router), `path` l'indirizzo
 * completo che compare nel browser: `/` per l'indice, `/<name>` per le altre.
 */
export const ROTTE_TAB = [
  { name: 'index', path: '/', title: 'Servizi', icona: 'home-outline' },
  { name: 'loop', path: '/loop', title: 'Loop', icona: 'sync-outline' },
  {
    name: 'offro-e-cerco',
    path: '/offro-e-cerco',
    title: 'Offro e cerco',
    icona: 'add-circle-outline',
  },
  { name: 'accordi', path: '/accordi', title: 'Accordi', icona: 'swap-horizontal-outline' },
  { name: 'profilo', path: '/profilo', title: 'Profilo', icona: 'person-outline' },
];

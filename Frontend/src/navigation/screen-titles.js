import { TAB_ROUTES } from './tab-routes';

/**
 * I titoli del documento: la parola che il browser scrive nella scheda, nei
 * segnalibri e nella cronologia.
 *
 * Non è un secondo elenco di nomi. Le cinque tab le prendono da `TAB_ROUTES`,
 * che è già la fonte unica di barra e menu del web; qui si aggiungono solo le
 * rotte secondarie, con la **stessa parola** che la loro intestazione mostra
 * (`Modifica profilo`, `Segnala alla staff`, `Area staff`, `Utenti`). Un titolo
 * di scheda che non corrisponde al titolo in pagina è una terza denominazione
 * della stessa schermata.
 *
 * `document.title` era vuoto su ogni rotta (`""` misurato dal vivo): ogni
 * scheda, ogni segnalibro e ogni voce di cronologia era una pagina senza nome
 * (audit UX F16). Expo Router disattiva di proposito il proprio titolo
 * (`documentTitle: { enabled: false }` in `ExpoRoot`) perché il rendering
 * statico conosce il percorso prima del tema; quindi la riga la scrive l'app.
 */
const NOME_APP = 'Baratto-lo';

/** Le rotte che non sono tab, con il titolo della loro intestazione. */
const TITOLI_SECONDARI = {
  '/login': 'Accedi',
  '/register': 'Crea il tuo profilo',
  '/edit-profile': 'Modifica profilo',
  // The inbox is a secondary screen like the two below it: the browser tab,
  // the bookmark and the history entry carry the same word the page shows.
  '/notifications': 'Notifiche',
  '/report': 'Segnala alla staff',
  '/staff': 'Area staff',
  '/staff-users': 'Utenti',
};

/**
 * Le rotte con un id nel percorso: il titolo è quello della famiglia, non
 * dell'id. `/chat/7` è la chat dell'accordo 7 e si chiama `Chat`, come un
 * qualsiasi accordo si chiama col nome della sua sezione.
 */
const TITOLI_CON_ID = [{ prefisso: '/chat/', titolo: 'Chat' }];

/** Il percorso senza barra finale, la forma con cui si confrontano le rotte. */
function percorsoNormalizzato(pathname) {
  if (typeof pathname !== 'string' || pathname === '') {
    return '/';
  }
  const senzaBarra = pathname.replace(/\/+$/, '');
  return senzaBarra === '' ? '/' : senzaBarra;
}

/**
 * Il titolo del documento per un percorso: `Servizi · Baratto-lo`. Una rotta
 * non elencata (la 404 compresa) resta il solo nome del prodotto, che è
 * comunque un titolo vero e non una stringa vuota.
 */
export function titoloDocumento(pathname) {
  const percorso = percorsoNormalizzato(pathname);
  const rotta = TAB_ROUTES.find((voce) => voce.path === percorso);
  const famiglia = TITOLI_CON_ID.find(
    (voce) => percorso.startsWith(voce.prefisso) && percorso.length > voce.prefisso.length,
  );
  const nome = rotta?.title ?? TITOLI_SECONDARI[percorso] ?? famiglia?.titolo ?? null;
  return nome === null ? NOME_APP : `${nome} · ${NOME_APP}`;
}

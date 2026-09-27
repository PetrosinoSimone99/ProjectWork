/**
 * Finti: le categorie.
 *
 * Stessa forma della risposta vera (`{categories:[{id, description}]}`, vedi
 * `MarketplaceController::listCategories`) perché il bivio in `api/barattolo.js`
 * normalizza un solo tipo di dato: il finto è fedele all'endpoint, non alla
 * schermata.
 *
 * La lista qui sotto è **segnaposto**: le categorie vere sono una decisione del
 * titolare e arriveranno dall'endpoint.
 */

/**
 * TODO(backend): le categorie vere arrivano da `GET /api/categories` e non si
 * inventano qui. Questa lista serve solo a far girare la demo.
 */
const CATEGORIE_FINTE = [
  { id: 1, description: 'Ripetizioni' },
  { id: 2, description: 'Montaggio mobili' },
  { id: 3, description: 'Riparazioni PC' },
  { id: 4, description: 'Giardinaggio' },
  { id: 5, description: 'Pulizie' },
  { id: 6, description: 'Informatica' },
  { id: 7, description: 'Fotografia' },
  { id: 8, description: 'Traduzioni' },
  { id: 9, description: 'Bricolage' },
  { id: 10, description: 'Pet sitting' },
];

/**
 * Attesa dichiarata prima di rispondere: il backend vero ha una latenza, e senza
 * questa lo stato «sto caricando le categorie» non si vedrebbe mai. Non è una
 * simulazione di rete, è solo il tempo necessario a renderlo rappresentabile.
 */
const ATTESA_FINTA_MS = 300;

/** Copie in uscita: chi riceve la lista non può modificare quella del modulo. */
function copieCategorie() {
  return CATEGORIE_FINTE.map((categoria) => ({ ...categoria }));
}

/** TODO(backend): `GET /api/categories` con la busta `{categories:[…]}`. */
export function ottieniCategorie() {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ categories: copieCategorie() }), ATTESA_FINTA_MS);
  });
}

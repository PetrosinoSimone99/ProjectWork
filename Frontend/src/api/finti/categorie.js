/**
 * Finti: le categorie.
 *
 * Stessa forma della risposta vera (`{success, message, data:{categorie:[…]}}`)
 * perché il bivio in `api/barattolo.js` normalizza un solo tipo di dato: il
 * finto è fedele all'endpoint, non alla schermata.
 *
 * La lista qui sotto è **segnaposto**: le categorie vere sono una decisione del
 * titolare e arriveranno dall'endpoint.
 */

/**
 * TODO(backend): le categorie vere arrivano da `GET categorie.php` e non si
 * inventano qui. Questa lista serve solo a far girare la demo.
 */
const CATEGORIE_FINTE = [
  { id: 1, nome: 'Ripetizioni' },
  { id: 2, nome: 'Montaggio mobili' },
  { id: 3, nome: 'Riparazioni PC' },
  { id: 4, nome: 'Giardinaggio' },
  { id: 5, nome: 'Pulizie' },
  { id: 6, nome: 'Informatica' },
  { id: 7, nome: 'Fotografia' },
  { id: 8, nome: 'Traduzioni' },
  { id: 9, nome: 'Bricolage' },
  { id: 10, nome: 'Pet sitting' },
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

/** TODO(backend): `GET categorie.php` con la busta `{success, message, data}`. */
export function ottieniCategorie() {
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          success: true,
          message: 'Categorie caricate.',
          data: { categorie: copieCategorie() },
        }),
      ATTESA_FINTA_MS,
    );
  });
}

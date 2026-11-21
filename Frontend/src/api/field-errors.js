import { MIN_PASSWORD_LENGTH } from '@/validation';

/**
 * Gli errori di campo che arrivano dal servizio, tradotti nelle chiavi del
 * modulo di registrazione.
 *
 * Il backend nomina i campi rifiutati (`fields`, contratto in `docs/api.md` e
 * decisione D037); l'italiano resta qui, perché un nome di campo è un contratto
 * stabile e una frase non lo è. La forma è quella che il modulo già usa per i
 * propri errori: una mappa `chiave → messaggio`, dove le chiavi sono `nome`,
 * `cognome`, `username`, `email`, `password`, `comune` e i due campi della prima
 * voce di ogni sezione (`offerte.0.mansione`, `ricerche.0.mansione`).
 *
 * Le due sezioni non hanno un posto proprio dove disegnare un errore: il server
 * rifiuta la voce intera (una sola voce, descrizione non vuota e non oltre 255
 * caratteri, almeno una categoria) e il punto più vicino allo sguardo è la
 * descrizione della prima voce. Un nome che non conosciamo non produce nessuna
 * chiave: resta il messaggio in fondo al modulo, e comunque non si perde.
 */
const MESSAGGI_PER_CAMPO = {
  name: {
    chiave: 'nome',
    messaggio: 'Il nome non è stato accettato: controlla che non sia vuoto e non sia troppo lungo.',
  },
  surname: {
    chiave: 'cognome',
    messaggio:
      'Il cognome non è stato accettato: controlla che non sia vuoto e non sia troppo lungo.',
  },
  username: {
    chiave: 'username',
    messaggio:
      "L'username non è stato accettato: controlla che non sia vuoto e non sia troppo lungo.",
  },
  email: {
    chiave: 'email',
    messaggio: "L'email non è stata accettata: controlla che sia completa e senza spazi.",
  },
  password: {
    chiave: 'password',
    messaggio: `La password non è stata accettata: servono almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
  },
  location: {
    chiave: 'comune',
    messaggio: 'La località non è stata accettata: scegli di nuovo provincia e comune.',
  },
  offers: {
    chiave: 'offerte.0.mansione',
    messaggio: "La tua offerta non è stata accettata: controlla la categoria e la descrizione.",
  },
  requests: {
    chiave: 'ricerche.0.mansione',
    messaggio: "La tua ricerca non è stata accettata: controlla la categoria e la descrizione.",
  },
};

/**
 * I nomi rifiutati (`["email", "password"]`) diventano la mappa degli errori del
 * modulo, più il numero di quelli che un posto nel modulo non ce l'hanno. Una
 * sola implementazione: la usano sia il test della mappa sia la schermata, così
 * le due non possono divergere.
 */
function mappaErrori(fields) {
  const errori = {};
  let nonMappati = 0;
  (Array.isArray(fields) ? fields : []).forEach((nome) => {
    const voce = typeof nome === 'string' ? MESSAGGI_PER_CAMPO[nome] : undefined;
    if (voce) {
      errori[voce.chiave] = voce.messaggio;
    } else {
      nonMappati += 1;
    }
  });
  return { errori, nonMappati };
}

/**
 * I nomi rifiutati (`["email", "password"]`) diventano la mappa degli errori del
 * modulo. Un nome sconosciuto viene ignorato: la frase in fondo al modulo resta
 * il posto dove finisce tutto ciò che non ha un campo.
 */
export function erroriDiCampoDaServer(fields) {
  return mappaErrori(fields).errori;
}

/**
 * Il rifiuto del server, diviso in quello che si può mettere sotto un campo e
 * quello che resta una frase in fondo al modulo.
 *
 * `messaggio` è `null` quando il server nomina almeno un campo e tutti hanno un
 * posto nel modulo: in quel caso la frase generica sarebbe solo rumore sopra un
 * errore che l'utente sta già guardando. Un corpo senza `fields`, un elenco
 * vuoto (non nomina niente: non c'è niente da mostrare sotto un campo) o un
 * errore che non viene dal server tengono la frase, come prima.
 */
export function esitoRifiutoRegistrazione(details, messaggio) {
  const campi = Array.isArray(details?.fields) ? details.fields : null;
  const { errori, nonMappati } = mappaErrori(campi);

  const tuttiMappati = campi !== null && campi.length > 0 && nonMappati === 0;

  return { errori, messaggio: tuttiMappati ? null : messaggio };
}

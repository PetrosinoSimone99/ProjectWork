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
 * modulo. Un nome sconosciuto viene ignorato: la frase in fondo al modulo resta
 * il posto dove finisce tutto ciò che non ha un campo.
 */
export function erroriDiCampoDaServer(fields) {
  if (!Array.isArray(fields)) {
    return {};
  }
  const errori = {};
  fields.forEach((nome) => {
    const voce = typeof nome === 'string' ? MESSAGGI_PER_CAMPO[nome] : undefined;
    if (voce) {
      errori[voce.chiave] = voce.messaggio;
    }
  });
  return errori;
}

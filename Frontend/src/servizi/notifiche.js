/**
 * Le notifiche in-app: la logica pura.
 *
 * Serve a un solo caso, deciso il 18 settembre 2026: **l'utente non vede lo
 * stato della propria segnalazione**. Quando la staff la chiude con un
 * provvedimento — o con un token — l'utente riceve questa notifica; se la staff
 * non prende provvedimenti, non arriva **niente**. Una notifica non è quindi un
 * registro da consultare: è un avviso che si chiude una volta letto («Ho capito»).
 *
 * Sono notifiche **in-app**, non push: `expo-notifications` e un endpoint che
 * registri i dispositivi non esistono, e il piano 09 le lascia fuori perimetro.
 * L'app se ne accorge quando si apre e quando torna in primo piano
 * (`hooks/useNotifiche.js`).
 *
 * Tre cose che questo modulo **non** fa, di proposito:
 * - **non inventa il testo della staff**: il messaggio del backend resta
 *   disponibile e, per un tipo che non conosciamo, è l'unica cosa che si mostra;
 * - **non deduce l'esito dalla segnalazione**: l'esito è della staff e arriva
 *   già scritto in una notifica;
 * - **non promette un token**: dice che un buono è stato assegnato solo quando la
 *   notifica lo porta (`idToken`), e a mostrarlo è l'area «I miei token».
 *
 * Nessuna funzione muta i dati ricevuti: copia, trasforma, restituisce.
 */

/**
 * I tipi di notifica: sono gli **esiti** del modello obiettivo che l'utente può
 * vedere. `NESSUN_PROVVEDIMENTO` non è qui di proposito: in quel caso non arriva
 * nessuna notifica. I nomi sono una proposta del frontend, coerenti con gli esiti
 * della Parte 21.
 */
export const TIPI_NOTIFICA = {
  TOKEN_ASSEGNATO: 'TOKEN_ASSEGNATO',
  UTENTE_SOSPESO: 'UTENTE_SOSPESO',
  UTENTE_BLOCCATO: 'UTENTE_BLOCCATO',
};

/** L'etichetta corta del tipo, per l'occhiello della scheda. */
export const ETICHETTE_TIPO = {
  [TIPI_NOTIFICA.TOKEN_ASSEGNATO]: 'Token assegnato',
  [TIPI_NOTIFICA.UTENTE_SOSPESO]: 'Utente sospeso',
  [TIPI_NOTIFICA.UTENTE_BLOCCATO]: 'Utente bloccato',
};

/**
 * Il testo in italiano di una notifica, **senza dati inventati**: non nomina
 * persone, date o motivi che non siano nella notifica stessa. Per un tipo noto è
 * una frase fissa (l'esito è quello, il resto lo aggiunge la staff nella nota);
 * per un tipo **ignoto** si mostra il messaggio del backend, oppure `null` se non
 * c'è — mai una frase generica che direbbe un esito a caso.
 */
export function descriviNotifica(notifica) {
  const tipo = typeof notifica?.tipo === 'string' ? notifica.tipo.trim().toUpperCase() : '';
  if (tipo === TIPI_NOTIFICA.TOKEN_ASSEGNATO) {
    return 'La staff ha esaminato la tua segnalazione e ti ha assegnato un token. Lo trovi in «I miei token».';
  }
  if (tipo === TIPI_NOTIFICA.UTENTE_SOSPESO) {
    return 'La staff ha esaminato la tua segnalazione e ha sospeso l\'utente segnalato.';
  }
  if (tipo === TIPI_NOTIFICA.UTENTE_BLOCCATO) {
    return 'La staff ha esaminato la tua segnalazione e ha bloccato l\'utente segnalato.';
  }
  const messaggio = typeof notifica?.messaggio === 'string' ? notifica.messaggio.trim() : '';
  return messaggio || null;
}

/** L'etichetta dell'occhiello: quella del tipo, oppure il tipo grezzo. */
export function etichettaTipoNotifica(tipo) {
  if (typeof tipo !== 'string' || tipo.trim() === '') {
    return null;
  }
  const chiave = tipo.trim().toUpperCase();
  return ETICHETTE_TIPO[chiave] ?? chiave;
}

/** `true` solo quando la notifica è esplicitamente non letta. */
export function eNonLetta(notifica) {
  return notifica?.letta !== true;
}

/**
 * Le notifiche **non lette**, nell'ordine in cui arrivano dal backend. L'avviso
 * mostra la prima; le altre restano nel deposito, così chi ricarica la pagina non
 * le perde.
 */
export function notificheNonLette(notifiche) {
  const elenco = Array.isArray(notifiche) ? notifiche : [];
  return elenco.filter(eNonLetta);
}

/**
 * Il corpo della richiesta «segna come letta». Il `404` (notifica di un altro o
 * inesistente) e il `403` li manda il backend e la schermata non li interpreta:
 * l'avviso si chiude comunque, perché è un avviso, non una pratica.
 */
export function aPayloadLetta(id) {
  return { id };
}

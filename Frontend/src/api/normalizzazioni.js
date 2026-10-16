import { STATI_PUBBLICAZIONE, TIPI_VOCE, filtriDaQuery } from '@/servizi/offerta-ricerca';
import { RIFERIMENTI, idRiferimento } from '@/servizi/segnalazioni';

/**
 * Le normalizzazioni condivise: dalla forma di rete del backend alla forma che
 * la UI può mostrare.
 *
 * Vivono qui e non in `api/barattolo.js` per una ragione misurata: il file degli
 * endpoint ha superato le 800 righe del progetto, e queste sono le funzioni pure
 * che si possono spostare **senza cambiare una riga di comportamento**. Lo
 * spostamento è stato fatto a più riprese e con l'ultimo, il 19 settembre 2026
 * (categorie, filtri del catalogo, coda, buoni, esito dell'invio e accordo),
 * **entrambi i file sono sotto il limite** (conteggi aggiornati il 24
 * settembre 2026: `barattolo.js` 799 righe, questo 796). `barattolo.js` le importa e continua a esporre quelle che erano
 * pubbliche.
 *
 * Le normalizzazioni di «Loop» (candidati, proposte, esiti) non stanno più qui:
 * sono nel loro file di area, `api/aree/loop.js`, insieme agli endpoint che
 * servono (P53).
 *
 * La regola vale per tutte: **copia, trasforma, restituisci**. Niente chiamate
 * di rete, niente import da `barattolo.js` (niente cicli), e ogni funzione
 * scarta le righe che la UI non può mostrare invece di disegnare dati inventati.
 */

/** Numero intero, oppure `null` per un valore assente o non numerico. */
export function numeroInteroONull(valore) {
  if (valore === null || valore === undefined || valore === '') {
    return null;
  }
  const numero = Number(valore);
  return Number.isInteger(numero) ? numero : null;
}

/** Nome addomesticato: stringa non vuota dopo `trim`, altrimenti `null`. */
export function testoONull(valore) {
  return typeof valore === 'string' && valore.trim() !== '' ? valore.trim() : null;
}

/**
 * I ruoli del backend (`User::ROLE_*`) nel ruolo interno della UI (`UTENTE | STAFF`
 * di `servizi/staff-utenti.js`), **in ordine di privilegio**: con più ruoli noti
 * vince il primo. Un ruolo sconosciuto non si traduce (resta solo in `ruoli`) e,
 * se nessun ruolo noto c'è, `ruolo` è `null`: la UI nasconde l'area staff (fail
 * closed). `User.php` ne definisce solo due: niente voci "per sicurezza".
 */
const RUOLI_INTERNI = [
  { role: 'ROLE_STAFF', ruolo: 'STAFF' },
  { role: 'ROLE_USER', ruolo: 'UTENTE' },
];

/** Il ruolo interno più privilegiato fra quelli noti in `ruoli`, oppure `null`. */
function ruoloDaRoles(ruoli) {
  for (const voce of RUOLI_INTERNI) {
    if (ruoli.includes(voce.role)) {
      return voce.ruolo;
    }
  }
  return null;
}

/**
 * L'utente della risposta di accesso nella forma interna di `api/finti/accesso.js`
 * e dei consumatori (`profilo.jsx`, `staff-utenti.jsx`, `servizi/staff-utenti.js`).
 *
 * Contratto (`AuthController.php`, `User::toApiArray()`): `{id, name, surname,
 * location, username, email, roles, accountStatus}`. `stato` resta **grezzo**
 * (`'ACTIVE'`/`'INACTIVE'`, `User::STATUS_*`): tradurlo in `ATTIVO`/`SOSPESO`/
 * `BLOCCATO` sarebbe un'equivalenza inventata. `roles` si copia così com'è.
 * Restituisce `null` se `user` non è un oggetto.
 */
function normalizzaUtenteAccesso(user) {
  if (user === null || typeof user !== 'object') {
    return null;
  }
  const ruoli = Array.isArray(user.roles) ? [...user.roles] : [];
  return {
    id: numeroInteroONull(user.id),
    nome: typeof user.name === 'string' ? user.name : '',
    cognome: typeof user.surname === 'string' ? user.surname : '',
    username: typeof user.username === 'string' ? user.username : '',
    email: typeof user.email === 'string' ? user.email : '',
    localita: testoONull(user.location),
    ruoli,
    ruolo: ruoloDaRoles(ruoli),
    stato: typeof user.accountStatus === 'string' ? user.accountStatus : null,
  };
}

/**
 * La risposta di accesso del backend Symfony nella forma interna:
 * `{token, user}` (login e registrazione, `AuthController.php`) → `{token, utente}`.
 * Copia, trasforma, restituisce: la risposta ricevuta non si tocca.
 */
export function normalizzaRispostaAccesso(risposta) {
  return {
    token: typeof risposta?.token === 'string' ? risposta.token : null,
    utente: normalizzaUtenteAccesso(risposta?.user),
  };
}

/**
 * Lo stato di pubblicazione nella forma che mostra la UI.
 * TODO(backend): i valori veri non sono decisi — se i colleghi scelgono
 * `ACTIVE`/`INACTIVE` o altri nomi, si cambia qui e nessun componente si tocca.
 * Una riga **senza** stato è «Pubblicata» (è così che la demo legge le voci
 * salvate prima che il campo esistesse); uno stato **sconosciuto** si
 * restituisce così com'è invece di nasconderlo.
 */
export function normalizzaStatoPubblicazione(stato) {
  if (typeof stato !== 'string' || !stato.trim()) {
    return STATI_PUBBLICAZIONE.PUBBLICATA;
  }
  return stato.trim().toUpperCase();
}

/** Lo stato con cui il backend può dire che la voce non c'è più. */
const STATO_ELIMINATA = 'ELIMINATA';

/**
 * Una riga di `servizi.php` nella forma della voce
 * (vedi `servizi/offerta-ricerca.js`). Restituisce `null` per le righe che la UI
 * non può mostrare: un tipo sconosciuto non ha una sezione in cui finire e una
 * voce eliminata non deve comparire. `indice` serve solo a dare una chiave
 * stabile a una riga senza id (che resta senza azioni: lezione di P37).
 */
export function normalizzaPubblicazione(riga, indice = 0) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }

  const tipo = typeof riga.tipo === 'string' ? riga.tipo.trim().toUpperCase() : '';
  if (tipo !== TIPI_VOCE.OFFERTA && tipo !== TIPI_VOCE.RICERCA) {
    return null;
  }

  const stato = normalizzaStatoPubblicazione(riga.stato);
  if (stato === STATO_ELIMINATA) {
    return null;
  }

  const id = numeroInteroONull(riga.id);
  return {
    chiave: id === null ? `${tipo}-riga-${indice}` : `${tipo}-${id}`,
    tipo,
    id,
    idCategoria: numeroInteroONull(riga.id_categoria),
    mansione: typeof riga.mansione === 'string' ? riga.mansione : '',
    daRemoto: riga.da_remoto === true,
    localita: typeof riga.localita === 'string' ? riga.localita : '',
    stato,
  };
}

/** La riga salvata: tollera la busta `{data:{servizio}}` e la riga nuda. */
export function normalizzaServizio(risposta) {
  return normalizzaPubblicazione(risposta?.data?.servizio ?? risposta?.servizio ?? risposta);
}

/** L'elenco: `{data:{servizi:[…]}}`, `{servizi:[…]}` oppure l'array nudo. */
export function normalizzaPubblicazioni(risposta) {
  const elenco = risposta?.data?.servizi ?? risposta?.servizi ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map((riga, indice) => normalizzaPubblicazione(riga, indice)).filter(Boolean);
}

/**
 * L'autore di una riga, tollerando la forma annidata (`offerente` del modello
 * vecchio, `owner` del backend Symfony) e quella piatta (`utente_id`, `nome`,
 * …): quale delle due sceglierà il backend è indifferente, le legge questa
 * normalizzazione. Anche i nomi dei campi arrivano in due lingue (`nome`/`name`)
 * e si leggono qui una volta sola, mai nei componenti.
 *
 * La località della **persona** (dal profilo) è cosa diversa dalla località
 * dell'annuncio: si legge solo dentro l'oggetto autore, e se manca non si mostra.
 */
export function normalizzaOfferente(riga) {
  const sorgente = riga?.offerente ?? riga?.owner;
  const dentro = sorgente && typeof sorgente === 'object' ? sorgente : {};
  return {
    id: numeroInteroONull(dentro.id ?? dentro.utente_id ?? riga?.utente_id),
    username: testoONull(dentro.username ?? riga?.username),
    nome: testoONull(dentro.nome ?? dentro.name ?? riga?.nome),
    cognome: testoONull(dentro.cognome ?? dentro.surname ?? riga?.cognome),
    localita: testoONull(dentro.localita ?? dentro.location),
  };
}

// ---------------------------------------------------------------------------
// Segnalazioni e notifiche in-app
//
// Stanno qui per la stessa ragione delle altre: sono funzioni pure che
// `barattolo.js` usa nel bivio dei finti e nel ramo vero, così la forma della
// segnalazione e della notifica è decisa **una volta sola**. Il riferimento al
// fatto (`id_gruppo` o `id_accordo`) usa `idRiferimento` di
// `servizi/segnalazioni.js`: la stessa regola serve alla rotta e alla
// validazione, e due copie divergerebbero.
// ---------------------------------------------------------------------------

/**
 * Il riferimento al fatto: `{tipo, id}`, da `id_gruppo` o `id_accordo`. `null`
 * quando il backend non ne manda nessuno — e in quel caso la riga non si inventa
 * un contesto.
 */
function normalizzaRiferimentoSegnalazione(riga) {
  const idGruppo = idRiferimento(riga?.id_gruppo ?? riga?.idGruppo);
  if (idGruppo !== null) {
    return { tipo: RIFERIMENTI.GRUPPO, id: idGruppo };
  }
  const idAccordo = idRiferimento(riga?.id_accordo ?? riga?.idAccordo);
  if (idAccordo !== null) {
    return { tipo: RIFERIMENTI.ACCORDO, id: idAccordo };
  }
  return null;
}

/**
 * Una segnalazione nella forma della UI. `stato` è in maiuscolo e uno stato
 * **ignoto passa così com'è**: la schermata lo mostra grezzo, non lo traduce a
 * caso (stessa vista neutra della coda e dei buoni). L'autore non c'è: è chi
 * chiede, e la UI non lo disegna.
 */
export function normalizzaSegnalazione(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const stato = typeof riga.stato === 'string' ? riga.stato.trim().toUpperCase() : '';
  const motivo = typeof riga.motivo === 'string' ? riga.motivo.trim() : '';
  return {
    id,
    stato: stato || null,
    motivo: motivo || null,
    descrizione: testoONull(riga.descrizione),
    segnalato: numeroInteroONull(riga.segnalato_id ?? riga.segnalatoId ?? riga.utente_segnalato_id),
    riferimento: normalizzaRiferimentoSegnalazione(riga),
    // `creato_il` è la convenzione del progetto; `creata_il` è la forma usata nella
    // proposta di `segnalazioni.php` (Parte 21): si accettano entrambe, così un
    // nome diverso non fa sparire la data.
    creataIl: testoONull(riga.creato_il ?? riga.creata_il ?? riga.creataIl),
  };
}

/** L'elenco delle segnalazioni: `{data:{segnalazioni:[…]}}` oppure l'array nudo. */
export function normalizzaSegnalazioni(risposta) {
  const elenco = risposta?.data?.segnalazioni ?? risposta?.segnalazioni ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaSegnalazione).filter(Boolean);
}

/**
 * Una persona **annidata** in una riga (`autore`, `segnalato`, `partecipanti`):
 * `{id, username, nome, cognome}`. `normalizzaOfferente` non serve qui perché
 * legge l'autore di un annuncio (annidato in `offerente` o piatto nella riga):
 * questa legge l'oggetto che *è* la persona. Tutto ciò che manca resta `null`,
 * senza inventare un nome.
 */
export function normalizzaPersona(valore) {
  if (!valore || typeof valore !== 'object') {
    return { id: null, username: null, nome: null, cognome: null };
  }
  return {
    id: numeroInteroONull(valore.id ?? valore.utente_id),
    username: testoONull(valore.username),
    nome: testoONull(valore.nome),
    cognome: testoONull(valore.cognome),
  };
}

/**
 * Gli esiti di una chiusura nella forma della UI: una lista di stringhe in
 * maiuscolo. Il backend puo mandarne una sola (`esito`) o piu di una (`esiti`),
 * e un valore ignoto **passa cosi com'è**: la schermata lo mostra grezzo invece
 * di tradurlo a caso (stessa vista neutra di stati e buoni).
 */
export function normalizzaEsiti(valore) {
  const elenco = Array.isArray(valore) ? valore : valore === null || valore === undefined ? [] : [valore];
  return elenco
    .map((esito) => (typeof esito === 'string' ? esito.trim().toUpperCase() : ''))
    .filter((esito) => esito !== '');
}

/**
 * Una segnalazione **vista dalla staff**: la forma della segnalazione piu chi l'ha
 * scritta, chi e stato segnalato, i partecipanti al fatto (per la scelta del
 * beneficiario del token) e l'esito della chiusura. L'autore qui c'e perche la
 * staff deve sapere chi ha segnalato; nella riga dell'utente non c'era — era chi
 * chiedeva, e la UI non lo disegnava.
 */
export function normalizzaSegnalazioneStaff(riga) {
  const base = normalizzaSegnalazione(riga);
  if (!base) {
    return null;
  }
  const autore = normalizzaPersona(riga?.autore ?? riga?.segnalante);
  const segnalato =
    riga?.segnalato && typeof riga.segnalato === 'object'
      ? normalizzaPersona(riga.segnalato)
      : { id: base.segnalato, username: null, nome: null, cognome: null };
  const dichiarati = Array.isArray(riga?.partecipanti)
    ? riga.partecipanti.map(normalizzaPersona).filter((persona) => persona.id !== null)
    : [];
  return {
    ...base,
    autore,
    segnalato,
    // Senza l'elenco dei partecipanti si ripiega sui due che la riga conosce:
    // la scelta del beneficiario resta possibile.
    partecipanti:
      dichiarati.length > 0
        ? dichiarati
        : [autore, segnalato].filter((persona) => persona.id !== null),
    gestitaDa: numeroInteroONull(riga?.gestito_da ?? riga?.gestitaDa),
    esiti: normalizzaEsiti(riga?.esiti ?? riga?.esito),
    nota: testoONull(riga?.nota ?? riga?.nota_staff),
    chiusaIl: testoONull(riga?.chiusa_il ?? riga?.chiuso_il ?? riga?.chiusaIl),
  };
}

/** L'elenco per la staff: `{data:{segnalazioni:[…]}}` oppure l'array nudo. */
export function normalizzaSegnalazioniStaff(risposta) {
  const elenco = risposta?.data?.segnalazioni ?? risposta?.segnalazioni ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaSegnalazioneStaff).filter(Boolean);
}

/**
 * Una notifica nella forma della UI. `letta` è `true` **solo** quando il backend
 * lo dice: una notifica senza il campo è da leggere. Il tipo ignoto resta com'è e
 * il testo lo decide `servizi/notifiche.js`.
 */
export function normalizzaNotifica(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const tipo = typeof riga.tipo === 'string' ? riga.tipo.trim() : '';
  return {
    id,
    tipo: tipo || null,
    messaggio: testoONull(riga.messaggio),
    idToken: numeroInteroONull(riga.id_token ?? riga.idToken),
    letta: riga.letta === true,
    creataIl: testoONull(riga.creata_il ?? riga.creataIl),
  };
}

/** L'elenco delle notifiche: `{data:{notifiche:[…]}}` oppure l'array nudo. */
export function normalizzaNotifiche(risposta) {
  const elenco = risposta?.data?.notifiche ?? risposta?.notifiche ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaNotifica).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Utenti dell'area staff
//
// Stanno qui per la stessa ragione delle altre: sono funzioni pure che
// `barattolo.js` usa nel bivio dei finti e nel ramo vero, così la forma della
// riga utente è decisa **una volta sola** e i due manager (che rispondono con la
// busta piatta `{messaggio, utente}`) non dettano la forma alla schermata.
// ---------------------------------------------------------------------------

/**
 * Un utente nella forma della UI: `{id, username, nome, cognome, ruolo, stato,
 * creatoIl}`. Ruolo e stato sono in maiuscolo e un valore **ignoto passa così
 * com'è**: la schermata lo mostra grezzo, non lo traduce a caso (stessa vista
 * neutra di stati e buoni). Una riga senza id non si può mostrare né gestire,
 * quindi si scarta.
 */
export function normalizzaUtenteStaff(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id ?? riga.utente_id);
  if (id === null) {
    return null;
  }
  const ruolo = typeof riga.ruolo === 'string' ? riga.ruolo.trim().toUpperCase() : '';
  const stato = typeof riga.stato === 'string' ? riga.stato.trim().toUpperCase() : '';
  return {
    id,
    username: testoONull(riga.username),
    nome: testoONull(riga.nome),
    cognome: testoONull(riga.cognome),
    ruolo: ruolo || null,
    stato: stato || null,
    creatoIl: testoONull(riga.creato_il ?? riga.creatoIl),
  };
}

/** L'elenco degli utenti: `{data:{utenti:[…]}}`, `{utenti:[…]}` oppure l'array nudo. */
export function normalizzaUtentiStaff(risposta) {
  const elenco = risposta?.data?.utenti ?? risposta?.utenti ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaUtenteStaff).filter(Boolean);
}

/**
 * L'esito dei due manager nella forma della schermata: l'utente aggiornato e il
 * `messaggio` del backend, gi\u00e0 pronto per il `Banner`. La busta \u00e8 **piatta**
 * (`{messaggio, utente}`, non `{success, message, data}`): \u00e8 la seconda busta del
 * progetto e la legge `client.js`.
 */
export function normalizzaEsitoUtenteStaff(risposta) {
  return {
    utente: normalizzaUtenteStaff(risposta?.utente ?? risposta),
    messaggio: typeof risposta?.messaggio === 'string' ? risposta.messaggio : '',
  };
}
// ---------------------------------------------------------------------------
// Buoni («I miei token»)
//
// Spostate qui dal file degli endpoint come le altre: sono pure. `stato` resta
// in maiuscolo e uno stato **ignoto passa così com'è**, perché è la schermata a
// mostrarlo grezzo; le date restano le stringhe del backend e le formatta
// `servizi/token.js`.
// ---------------------------------------------------------------------------

/**
 * Un buono nella forma della UI. `stato` è in maiuscolo e uno stato **ignoto
 * passa così com'è**: la schermata lo mostra grezzo (stessa vista neutra della
 * coda), non lo traduce a caso. Le date restano le stringhe del backend:
 * formattarle è compito di `servizi/token.js`.
 */
export function normalizzaToken(riga) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  if (id === null) {
    return null;
  }
  const stato = typeof riga.stato === 'string' ? riga.stato.trim().toUpperCase() : '';
  return {
    id,
    stato: stato || null,
    origine: testoONull(riga.origine),
    creatoIl: testoONull(riga.creato_il ?? riga.creatoIl),
    scadenza: testoONull(riga.scadenza),
    usatoIl: testoONull(riga.usato_il ?? riga.usatoIl),
    idServizioUsato: numeroInteroONull(riga.id_servizio_usato ?? riga.idServizioUsato),
    idAccordo: numeroInteroONull(riga.id_accordo ?? riga.idAccordo),
  };
}

/** L'elenco dei buoni: `{data:{token:[…]}}` oppure l'array nudo. */
export function normalizzaElencoToken(risposta) {
  const elenco = risposta?.data?.token ?? risposta?.token ?? risposta;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco.map(normalizzaToken).filter(Boolean);
}
// ---------------------------------------------------------------------------
// Il catalogo della home (`GET /api/services` del backend Symfony)
//
// Il contratto (`MarketplaceController::listServices` +
// `Service::toHomepageOfferApiArray`) manda `{offers: [...], pagination: {page,
// limit, totalItems, totalPages}}`; ogni offerta ha `description`, `categories:
// [{id, description}]`, `createdAt` (ISO 8601) e `owner: {id, name, surname,
// username, location, …}`.
//
// La riga normalizzata resta in italiano di dominio come il resto del repo:
// `{chiave, id, descrizione, categorie, offerente, pubblicatoIl}`. Non porta
// `tipo` né `stato`: per contratto il catalogo è **solo** offerte attive di
// utenti attivi, e la query del backend lo garantisce già.
// ---------------------------------------------------------------------------

/**
 * La paginazione nella forma della UI: `{pagina, limite, elementiTotali,
 * pagineTotali}`. I valori che non sono interi diventano `null`: chi legge
 * decide se mostrare «Carica altri», senza inventare numeri.
 */
export function normalizzaPaginazione(paginazione) {
  return {
    pagina: numeroInteroONull(paginazione?.page),
    limite: numeroInteroONull(paginazione?.limit),
    elementiTotali: numeroInteroONull(paginazione?.totalItems),
    pagineTotali: numeroInteroONull(paginazione?.totalPages),
  };
}

/**
 * Una riga di `offers` nella forma della riga di catalogo. `indice` serve solo
 * a dare una chiave stabile alla riga senza id.
 *
 * Le righe **senza descrizione si scartano** (per contratto non esistono) e le
 * categorie si normalizzano con `normalizzaCategorie`: le righe di `offers`
 * portano lo stesso formato della tendina (`[{id, description}]`), quindi la
 * mappatura `{id, nome}` è una sola. La riga non porta tipo né stato, ma porta
 * `isRemote` (modalità «da remoto»/«in presenza»): qui diventa `daRemoto`, lo
 * stesso vocabolario di `VoceServizio`.
 *
 * `location` è la località **del servizio** (così come l'ha salvata chi l'ha
 * pubblicato), cosa diversa da `offerente.localita` (che resta com'è): diventa
 * `localita`. Le voci più vecchie non hanno il campo → `null`.
 */
export function normalizzaOffertaCatalogo(riga, indice = 0) {
  if (!riga || typeof riga !== 'object') {
    return null;
  }
  const descrizione = testoONull(riga.description);
  if (descrizione === null) {
    return null;
  }
  const id = numeroInteroONull(riga.id);
  return {
    chiave: id === null ? `offerta-riga-${indice}` : `offerta-${id}`,
    id,
    descrizione,
    daRemoto: riga.isRemote === true,
    localita: testoONull(riga.location),
    categorie: normalizzaCategorie(riga),
    offerente: normalizzaOfferente(riga),
    // `createdAt` è ISO 8601 (DATE_ATOM): qui non si parsano date, il formato
    // si decide alla card.
    pubblicatoIl: testoONull(riga.createdAt),
  };
}

/**
 * Il catalogo della home: `{elenco, paginazione}`.
 *
 * Due decisioni vivono qui e in nessun altro punto:
 * - **le righe proprie non entrano nel catalogo** (in home si vedono solo gli
 *   altri): la query del backend esclude già il viewer, ma il frontend non si
 *   fida della query per una decisione che è sua;
 * - le righe senza descrizione si scartano invece di disegnare dati vuoti.
 */
export function normalizzaCatalogo(risposta, utenteId) {
  const elenco = Array.isArray(risposta?.offers) ? risposta.offers : [];
  return {
    elenco: elenco
      .map((riga, indice) => {
        const voce = normalizzaOffertaCatalogo(riga, indice);
        if (!voce) {
          return null;
        }
        if (voce.offerente.id !== null && Number(voce.offerente.id) === Number(utenteId)) {
          return null;
        }
        return voce;
      })
      .filter(Boolean),
    paginazione: normalizzaPaginazione(risposta?.pagination),
  };
}

// ---------------------------------------------------------------------------
// Categorie e filtri del catalogo
//
// Spostate qui dal file degli endpoint: sono pure. La categoria diventa
// `{id, nome}` con l'id numerico e le righe senza id o senza nome si scartano,
// così la tendina non mostra righe vuote; `queryDaFiltri` costruisce la query
// string del catalogo e omette le condizioni non attive.
//
// Il `nome` è un'**etichetta di display**: il backend manda la `description`
// come sta nel database (oggi in inglese per alcune categorie) e la mappa qui
// sotto la traduce per chip e tendine. È una toppa di frontend, non la
// correzione del dato: la fonte vera è il DB dei colleghi e la richiesta sta in
// `temp/gruppo-3-mancanti/26-categorie-in-italiano.md` (scala §4 di
// `AGENTS.md`). L'`id` non si tocca mai: i filtri viaggiano su quello.
// ---------------------------------------------------------------------------

/**
 * Le etichette italiane delle categorie **a display**, con la `description`
 * grezza come chiave.
 *
 * Copre solo i valori osservati nel database (`curl /api/categories` del
 * 5 ottobre 2026: `Cleaning`, `Cooking`, `Danza`, `Gardening`, `Musica`); i
 * valori già in italiano (`Danza`, `Musica`) non servono e ricadono sul
 * fallback. Una categoria nuova e non mappata si mostra com'è (fallback nel
 * valore grezzo): non si inventano traduzioni, si aggiorna la mappa quando il
 * DB cresce.
 */
const ETICHETTE_CATEGORIE = {
  Cleaning: 'Pulizie',
  Cooking: 'Cucina',
  Gardening: 'Giardinaggio',
};

/**
 * L'etichetta italiana di una categoria a display: la traduzione della mappa
 * quando esiste, altrimenti il valore grezzo. `null` per un valore assente o
 * non testuale, così il chiamante può scartare la riga senza inventare nomi.
 */
export function etichettaCategoria(testo) {
  const grezzo = testoONull(testo);
  if (grezzo === null) {
    return null;
  }
  return ETICHETTE_CATEGORIE[grezzo] ?? grezzo;
}

/**
 * Le categorie nella forma che serve alla UI: `[{id, nome}]`.
 *
 * Stessa normalizzazione per il finto e per il backend vero, così la schermata
 * non vede mai due forme diverse: il backend manda `{categories:[{id,
 * description}]}` e qui `description` diventa `nome`, passando da
 * `etichettaCategoria` (etichetta di display, con fallback sul grezzo). L'id
 * diventa numero (il confronto con `idCategoria` è numerico) e le voci senza id
 * o senza nome vengono scartate invece di disegnare una tendina con righe
 * vuote.
 */
export function normalizzaCategorie(risposta) {
  const elenco = risposta?.categories;
  if (!Array.isArray(elenco)) {
    return [];
  }
  return elenco
    .map((categoria) => ({
      id: Number(categoria?.id),
      nome: etichettaCategoria(categoria?.description) ?? '',
    }))
    .filter((categoria) => Number.isInteger(categoria.id) && categoria.nome !== '');
}

/**
 * La query string di `GET /api/services`: i filtri attivi più la paginazione.
 * Le condizioni non attive si omettono (da `filtriDaQuery`), mentre `page` e
 * `limit` viaggiano sempre: sono numeri, non condizioni. `limit` è `null` quando
 * il chiamante vuole il default del backend.
 */
export function queryDaFiltri(filtri, pagina = 1, limite = null) {
  const parametri = {
    ...filtriDaQuery(filtri),
    page: pagina,
    ...(Number.isInteger(limite) ? { limit: limite } : {}),
  };
  const voci = Object.entries(parametri).map(
    ([chiave, valore]) => `${chiave}=${encodeURIComponent(valore)}`,
  );
  return `?${voci.join('&')}`;
}

// ---------------------------------------------------------------------------
// Esito dell'invio di una segnalazione
// ---------------------------------------------------------------------------

/**
 * L'esito dell'invio nella forma della schermata: la segnalazione creata e il
 * `message` del backend, già pronto per il `Banner`. È pura e usa
 * `normalizzaSegnalazione`, che sta in questo file.
 */
export function normalizzaEsitoInvio(risposta) {
  const dati = risposta?.data ?? risposta;
  return {
    segnalazione: normalizzaSegnalazione(dati?.segnalazione ?? dati),
    messaggio: typeof risposta?.message === 'string' ? risposta.message : '',
  };
}

// ---------------------------------------------------------------------------
// Accordi 1:1
// ---------------------------------------------------------------------------

/**
 * Aggiunge all'accordo ciò che il backend non manda: chi sono io, chi è l'altro.
 * Copia-trasforma-restituisce: l'accordo di risposta non viene mai mutato.
 */
export function normalizzaAccordo(accordo, utenteId) {
  if (!accordo || !Array.isArray(accordo.partecipanti)) {
    return accordo;
  }
  const io =
    accordo.partecipanti.find((p) => Number(p.id_utente) === Number(utenteId)) ?? null;
  const altro =
    accordo.partecipanti.find((p) => Number(p.id_utente) !== Number(utenteId)) ?? null;
  return { ...accordo, io, altro };
}

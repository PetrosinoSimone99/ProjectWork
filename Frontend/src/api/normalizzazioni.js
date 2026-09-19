import { STATI_PUBBLICAZIONE, TIPI_VOCE } from '@/servizi/offerta-ricerca';
import { RIFERIMENTI, idRiferimento } from '@/servizi/segnalazioni';

/**
 * Le normalizzazioni condivise: dalla forma di rete del backend alla forma che
 * la UI può mostrare.
 *
 * Vivono qui e non in `api/barattolo.js` per una ragione misurata: il file degli
 * endpoint ha superato le 800 righe del progetto, e queste sono le funzioni pure
 * che si possono spostare **senza cambiare una riga di comportamento** (il
 * piano della coda prevedeva esattamente questo taglio). `barattolo.js` le
 * importa e continua a esporre quelle che erano pubbliche.
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
 * L'autore di una riga di catalogo, tollerando la forma annidata (`offerente`)
 * e quella piatta (`utente_id`, `nome`, …): quale delle due sceglieranno i
 * colleghi è indifferente, le legge questa normalizzazione.
 *
 * La località della **persona** (dal profilo) è cosa diversa dalla località
 * dell'annuncio: si legge solo dentro `offerente`, e se manca non si mostra.
 */
export function normalizzaOfferente(riga) {
  const dentro = riga?.offerente && typeof riga.offerente === 'object' ? riga.offerente : {};
  return {
    id: numeroInteroONull(dentro.id ?? dentro.utente_id ?? riga?.utente_id),
    username: testoONull(dentro.username ?? riga?.username),
    nome: testoONull(dentro.nome ?? riga?.nome),
    cognome: testoONull(dentro.cognome ?? riga?.cognome),
    localita: testoONull(dentro.localita),
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

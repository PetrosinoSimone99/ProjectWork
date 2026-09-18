import { STATI_PUBBLICAZIONE, TIPI_VOCE } from '@/servizi/offerta-ricerca';

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

/**
 * I candidati di «Loop» (lo swipe): i motivi, le parole dei pulsanti e i testi
 * della scheda.
 *
 * È il secondo modulo di dominio di offerta e ricerca, accanto a
 * `offerta-ricerca.js`: la forma della voce e i filtri del catalogo stanno là,
 * qui sta **la compatibilità fra due persone**. La divisione è la stessa che c'è
 * fra `ChipStatoAccordo` e gli stati degli accordi: due cose diverse, due case
 * diverse — e `offerta-ricerca.js` sarebbe oltre la soglia di righe del
 * progetto.
 *
 * Non è un doppione: le funzioni della voce (`nomeCategoria`, `nomePersona`,
 * `etichettaModalita`) si **importano** da là. Nessuna funzione muta i dati
 * ricevuti.
 */

import { etichettaModalita, nomeCategoria, nomePersona } from './offerta-ricerca';

/** Le due scelte che si registrano su una scheda. */
export const SCELTE_CANDIDATO = { INTERESSE: 'INTERESSE', PASSA: 'PASSA' };

/**
 * I tre motivi per cui un candidato entra nella pila.
 * TODO(backend): i **valori** sono una proposta — il backend li calcolerà per
 * conto suo (categoria mia contro categoria sua) e li chiamerà come vuole;
 * `barattolo.js` li normalizza in un punto solo, quindi un nome diverso costa
 * una funzione.
 */
export const MOTIVI_COMPATIBILITA = {
  CERCA_QUELLO_CHE_OFFRO: 'CERCA_QUELLO_CHE_OFFRO',
  OFFRE_QUELLO_CHE_CERCO: 'OFFRE_QUELLO_CHE_CERCO',
  ENTRAMBI: 'ENTRAMBI',
};

/** Le etichette italiane dei motivi: una per valore, scritte una volta sola. */
export const ETICHETTE_MOTIVO = {
  [MOTIVI_COMPATIBILITA.CERCA_QUELLO_CHE_OFFRO]: 'Cerca quello che offri',
  [MOTIVI_COMPATIBILITA.OFFRE_QUELLO_CHE_CERCO]: 'Offre quello che cerchi',
  [MOTIVI_COMPATIBILITA.ENTRAMBI]: 'Cerca quello che offri e offre quello che cerchi',
};

/**
 * Il motivo nella forma che la UI conosce. Un valore **sconosciuto o assente**
 * diventa `null`: la riga sparisce e non si traduce con una frase generica — un
 * motivo che non capiamo non è un motivo.
 */
export function motivoCompatibilita(valore) {
  const chiave = typeof valore === 'string' ? valore.trim().toUpperCase() : '';
  return Object.prototype.hasOwnProperty.call(ETICHETTE_MOTIVO, chiave) ? chiave : null;
}

/** L'etichetta del motivo, oppure `null` quando non c'è o non lo conosciamo. */
export function etichettaMotivo(motivo) {
  return ETICHETTE_MOTIVO[motivo] ?? null;
}

/**
 * Le due coppie di parole dei pulsanti della scheda. Il copy vive qui, in un
 * punto solo: cambiare «Mi interessa» con un'altra parola costa una riga e non
 * tocca nessun componente.
 */
export const AZIONI_SCHEDA = {
  CANDIDATO: { positiva: 'Mi interessa', negativa: 'Passa' },
  LIKE_RICEVUTO: { positiva: 'Accetta', negativa: 'Rifiuta' },
};

/** La coppia giusta per la scheda: chi mi ha già messo like si accetta o si rifiuta. */
export function azioniScheda(tiHaScelto) {
  return tiHaScelto === true ? AZIONI_SCHEDA.LIKE_RICEVUTO : AZIONI_SCHEDA.CANDIDATO;
}

/**
 * La chiave di una scheda: **la persona** (una persona = una sua offerta = una
 * scheda, decisione del titolare del 17 settembre 2026). L'id dell'offerta
 * viaggia comunque con la scelta, perché è quello che il backend registra.
 */
export function chiaveCandidato(candidato) {
  return String(candidato?.persona?.id ?? '');
}

/**
 * Una riga sola che descrive la scheda. È l'etichetta accessibile del gruppo e
 * il testo della regione viva che annuncia il cambio di scheda: chi usa un
 * lettore di schermo sente **una** frase, non cinque frammenti da comporre.
 */
export function descriviCandidato(candidato, categorie = []) {
  if (!candidato) {
    return '';
  }
  const persona = candidato.persona ?? {};
  const offerta = candidato.offerta ?? {};
  const nome = nomePersona(persona);
  const testa = [persona.username ? `${nome}, @${persona.username}` : nome];

  const categoria = nomeCategoria(categorie, offerta.idCategoria) ?? 'categoria non disponibile';
  const mansione = offerta.mansione?.trim() || 'mansione non indicata';
  testa.push(`offre ${categoria}: ${mansione}`);
  testa.push(etichettaModalita(offerta.daRemoto));
  if (offerta.localita) {
    testa.push(`a ${offerta.localita}`);
  }

  const frasi = [testa.join(', ')];
  const motivo = etichettaMotivo(candidato.motivo);
  if (motivo) {
    frasi.push(motivo);
  }
  if (candidato.tiHaScelto === true) {
    frasi.push('Ti ha messo like');
  }
  return `${frasi.join('. ')}.`;
}

/**
 * La riga «Cerca: …» della scheda: cosa cerca la persona mostrata. Si disegna
 * **solo** quando serve a spiegare il motivo (la condizione sta nella scheda, il
 * testo qui) e vale `null` quando la ricerca non c'è.
 */
export function descriviRicerca(ricerca, categorie = []) {
  if (!ricerca) {
    return null;
  }
  const categoria = nomeCategoria(categorie, ricerca.idCategoria) ?? 'Categoria non disponibile';
  const mansione = ricerca.mansione?.trim() || 'Mansione non indicata';
  return `${categoria} · ${mansione}`;
}

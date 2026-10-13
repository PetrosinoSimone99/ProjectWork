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
import { localitaPerDisplay } from './aree-italiane';

/** Le due scelte che si registrano su una scheda. */
export const SCELTE_CANDIDATO = { INTERESSE: 'INTERESSE', PASSA: 'PASSA' };

/**
 * Le due decisioni su una proposta in attesa. I valori sono quelli che il
 * contratto si aspetta (`POST /api/proposals/{id}/decision`): la conversione
 * delle **direzioni** dello swipe sta invece nel layer (`api/aree/loop.js`).
 */
export const DECISIONI_PROPOSTA = { ACCETTA: 'ACCEPT', RIFIUTA: 'REJECT' };

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
 * Il messaggio dell'esito di una scelta o di una decisione: il testo del
 * `Banner` di «Loop», scritto una volta sola qui.
 *
 * Il match viene prima di tutto: quando c'è è l'unica cosa che conta da dire.
 * Le altre frasi derivano dalla scelta fatta; un esito che non si capisce non
 * produce testo (`null`), e la schermata non mostra il banner invece di
 * inventare una frase.
 */
export function messaggioEsito(esito) {
  if (esito?.match === true) {
    return 'È un match!';
  }
  switch (esito?.scelta) {
    case SCELTE_CANDIDATO.INTERESSE:
      return 'Interesse registrato.';
    case SCELTE_CANDIDATO.PASSA:
      return 'Passata.';
    case DECISIONI_PROPOSTA.ACCETTA:
      return 'Proposta accettata.';
    case DECISIONI_PROPOSTA.RIFIUTA:
      return 'Proposta rifiutata.';
    default:
      return null;
  }
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
  // La modalità (da remoto / in presenza) si dice solo quando la si conosce: il
  // contratto dei servizi del feed non la modella e non si dichiara «in
  // presenza» un dato che non esiste (vincolo 4 del piano di Loop).
  const modalita =
    typeof offerta.daRemoto === 'boolean' ? etichettaModalita(offerta.daRemoto) : null;
  if (modalita) {
    testa.push(modalita);
  }
  if (offerta.localita) {
    testa.push(`a ${localitaPerDisplay(offerta.localita)}`);
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
 * La riga che descrive una **proposta in attesa**: come `descriviCandidato`, è
 * l'etichetta accessibile del gruppo e dice una sola frase — persona, offerta
 * che porta e cosa aspetta da me (la decisione).
 */
export function descriviProposta(proposta, categorie = []) {
  if (!proposta) {
    return '';
  }
  const persona = proposta.persona ?? {};
  const servizio = proposta.servizio ?? {};
  const nome = nomePersona(persona);
  const testa = [persona.username ? `${nome}, @${persona.username}` : nome];
  const categoria = nomeCategoria(categorie, servizio.idCategoria) ?? 'categoria non disponibile';
  const mansione = servizio.mansione?.trim() || 'mansione non indicata';
  testa.push(`offre ${categoria}: ${mansione}`);
  return `${testa.join(', ')}. Ti propone uno scambio e aspetta la tua decisione.`;
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

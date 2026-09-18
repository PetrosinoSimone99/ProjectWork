/**
 * La coda e i gruppi di match: la logica pura della catena.
 *
 * È il terzo modulo di dominio, accanto a `offerta-ricerca.js` (la forma della
 * voce) e `candidati.js` (la compatibilità fra due persone): qui c'è **la
 * catena** — gli stati del gruppo, la traduzione del contratto in una delle
 * viste della schermata e i testi che leggono i versi dichiarati dal backend.
 *
 * Tre cose che questo modulo **non** fa, di proposito:
 * - **non calcola la catena**: legge `offre_a`, cioè i versi che il backend ha
 *   già dichiarato, e senza quelli non disegna frecce né controparti;
 * - **non decide esiti**: non dichiara un gruppo pronto o saltato, e non deduce
 *   chi ha diritto al token (`puoiChiedereToken` è un campo del backend);
 * - **non inventa un tempo**: la scadenza arriva da fuori, già in epoch.
 *
 * Le funzioni della voce (`nomePersona`, `nomeCategoria`, `etichettaModalita`)
 * si **importano** da `offerta-ricerca.js`, non si ricopiano. `formattaDurata`
 * arriva da `accordi/stati.js` in **sola lettura**: l'area 1:1 è congelata e
 * quell'import non la modifica — il giorno in cui il congelamento finisce, le due
 * funzioni di formato si spostano in un modulo condiviso.
 *
 * Nessuna funzione muta i dati ricevuti: copia, trasforma, restituisce.
 */

import { formattaDurata } from '@/accordi/stati';
import { etichettaModalita, nomeCategoria, nomePersona } from './offerta-ricerca';

/**
 * Gli stati di un gruppo di match.
 * TODO(backend): i valori sono quelli **proposti** nella Parte 20 delle
 * segnalazioni (enum di `gruppi_match`), non un contratto firmato. La
 * normalizzazione in `api/barattolo.js` li mette in maiuscolo e lascia passare
 * un valore ignoto, quindi il giorno in cui i colleghi scelgono altri nomi
 * cambiano le due mappe qui sotto.
 */
export const STATI_GRUPPO = {
  IN_FORMAZIONE: 'IN_FORMAZIONE',
  PRONTO: 'PRONTO',
  ANNULATO: 'ANNULATO',
  CONCLUSA: 'CONCLUSA',
};

/** Etichette italiane degli stati. «Saltata» dice cosa è successo, non solo che è finita. */
export const ETICHETTE_STATO_GRUPPO = {
  [STATI_GRUPPO.IN_FORMAZIONE]: 'In ricerca',
  [STATI_GRUPPO.PRONTO]: 'Pronto',
  [STATI_GRUPPO.ANNULATO]: 'Saltata',
  [STATI_GRUPPO.CONCLUSA]: 'Conclusa',
};

/**
 * L'etichetta di uno stato, oppure il **valore grezzo** se non lo conosciamo:
 * uno stato ignoto si mostra così com'è, non si traduce con una frase generica
 * (sarebbe un esito inventato per omissione). `null` solo quando lo stato manca.
 */
export function etichettaStatoGruppo(stato) {
  if (typeof stato !== 'string' || stato.trim() === '') {
    return null;
  }
  const chiave = stato.trim().toUpperCase();
  return ETICHETTE_STATO_GRUPPO[chiave] ?? chiave;
}

/**
 * Tono del chip dello stato: `service` (verde) per «Pronto», `info` (neutro) per
 * tutto il resto. Il colore non è mai l'unico segnale: la parola sta accanto.
 */
export function tonoStatoGruppo(stato) {
  return stato === STATI_GRUPPO.PRONTO ? 'service' : 'info';
}

/** Le cinque viste della schermata. Una funzione sola traduce il contratto in queste. */
export const VISTE = {
  NESSUNO: 'NESSUNO',
  IN_RICERCA: 'IN_RICERCA',
  PRONTO: 'PRONTO',
  ANNULATO: 'ANNULATO',
  NEUTRA: 'NEUTRA',
};

/**
 * Da `{inCoda, gruppo, ...}` alla vista da disegnare. Nessuna deduzione:
 * - `PRONTO`/`ANNULATO`/`IN_FORMAZIONE` → la vista corrispondente;
 * - `CONCLUSA` → è una catena nello storico, quindi `NESSUNO`;
 * - uno stato **sconosciuto** → `NEUTRA` (si mostra il valore grezzo, i membri
 *   se ci sono, e nessun esito dichiarato);
 * - nessun gruppo ma `inCoda` → `IN_RICERCA` (la ricerca può esistere prima che
 *   il cerchio sia formato);
 * - altrimenti → `NESSUNO`.
 */
export function statoVista(dati) {
  if (!dati) {
    return VISTE.NESSUNO;
  }
  const stato = typeof dati.gruppo?.stato === 'string' ? dati.gruppo.stato.toUpperCase() : null;
  if (stato === STATI_GRUPPO.PRONTO) {
    return VISTE.PRONTO;
  }
  if (stato === STATI_GRUPPO.ANNULATO) {
    return VISTE.ANNULATO;
  }
  if (stato === STATI_GRUPPO.IN_FORMAZIONE) {
    return VISTE.IN_RICERCA;
  }
  if (stato === STATI_GRUPPO.CONCLUSA) {
    return VISTE.NESSUNO;
  }
  if (stato !== null) {
    return VISTE.NEUTRA;
  }
  return dati.inCoda === true ? VISTE.IN_RICERCA : VISTE.NESSUNO;
}

/** I membri in ordine di catena: copia ordinata per `posizione`, mai i dati originali. */
export function membriInOrdine(membri) {
  if (!Array.isArray(membri)) {
    return [];
  }
  return [...membri].sort((primo, secondo) => (primo.posizione ?? 0) - (secondo.posizione ?? 0));
}

/** Il membro a cui punta la freccia di `membro`, o `null` se il verso non c'è. */
export function versoCatena(membro, membri) {
  const arco = membro?.offreA;
  if (!arco) {
    return null;
  }
  const elenco = membriInOrdine(membri);
  if (arco.utenteId !== null && arco.utenteId !== undefined) {
    const perId = elenco.find((altro) => Number(altro.persona?.id) === Number(arco.utenteId));
    if (perId) {
      return perId;
    }
  }
  if (arco.posizione !== null && arco.posizione !== undefined) {
    return elenco.find((altro) => altro.posizione === arco.posizione) ?? null;
  }
  return null;
}

/**
 * Le due conversazioni 1:1 della catena (mai una chat di gruppo): chi mi offre il
 * servizio che voglio — il membro la cui freccia punta **a me** — e chi vuole il
 * servizio che offro — il destinatario della **mia** freccia.
 *
 * Legge **solo** gli archi che il backend ha dichiarato: se `offre_a` manca,
 * restituisce un elenco vuoto e la schermata non mostra nessuna chat. Non
 * ricostruisce la catena, non duplica la stessa persona due volte.
 */
export function contropartiChat(io, membri) {
  const elenco = membriInOrdine(membri);
  if (!io || elenco.length === 0) {
    return [];
  }
  const controparti = [];
  const aggiungi = (ruolo, membro) => {
    if (!membro || membro.sonoIo) {
      return;
    }
    const gia = controparti.some(
      (controparte) => Number(controparte.persona?.id) === Number(membro.persona?.id),
    );
    if (!gia) {
      controparti.push({ ruolo, persona: membro.persona, offerta: membro.offerta });
    }
  };

  const chiMiOffre = elenco.find(
    (altro) => !altro.sonoIo && versoCatena(altro, elenco)?.sonoIo === true,
  );
  aggiungi('MI_OFFRE', chiMiOffre);
  aggiungi('RICEVE_DA_ME', versoCatena(io, elenco));
  return controparti;
}

/**
 * La riga di chi è uscito: «Hai lasciato tu il gruppo» oppure «Mario Rossi ha
 * lasciato il gruppo». `null` quando il backend non dice chi è uscito — e in quel
 * caso la schermata **non scrive nessun nome**.
 */
export function testoUscita(uscita, utenteId) {
  if (!uscita) {
    return null;
  }
  if (uscita.utenteId !== null && Number(uscita.utenteId) === Number(utenteId)) {
    return 'Hai lasciato tu il gruppo';
  }
  return `${nomePersona(uscita.persona ?? uscita)} ha lasciato il gruppo`;
}

/**
 * Il residuo in minuti come testo: «2 h 41 min», «41 min», «meno di un minuto»,
 * «tempo scaduto». `null` quando il residuo non c'è. Non si scrive mai «0 min»:
 * `formattaDurata(0)` restituisce `null` e quel caso ha il suo testo.
 */
export function testoTempoResiduo(minutiResidui) {
  if (minutiResidui === null || minutiResidui === undefined) {
    return null;
  }
  if (minutiResidui <= 0) {
    return 'tempo scaduto';
  }
  if (minutiResidui < 1) {
    return 'meno di un minuto';
  }
  return formattaDurata(minutiResidui);
}

/**
 * L'ora di scadenza (`18:32`) da un istante in epoch, oppure `null` se il valore
 * non è un numero. Si mostra accanto al residuo: l'ora è il dato del backend
 * così com'è, e serve se l'orologio del dispositivo è sbagliato.
 */
export function formattaOra(epochMs) {
  if (!Number.isFinite(epochMs)) {
    return null;
  }
  const data = new Date(epochMs);
  const ore = String(data.getHours()).padStart(2, '0');
  const minuti = String(data.getMinutes()).padStart(2, '0');
  return `${ore}:${minuti}`;
}

/**
 * La riga del tempo: residuo **e** ora di scadenza, oppure il perché il numero
 * manca («La scadenza non è ancora disponibile»). Sta qui e non in un componente
 * perché la usano sia `CardGruppo` sia la vista senza gruppo della schermata, e
 * due copie della stessa formattazione divergono.
 */
export function testoScadenza(tempo, scadenzaMs) {
  if (tempo.illeggibile) {
    return 'La scadenza non è ancora disponibile';
  }
  if (tempo.scaduto) {
    return 'Tempo scaduto: aggiorno lo stato…';
  }
  const residuo = testoTempoResiduo(tempo.minutiResidui);
  const ora = formattaOra(scadenzaMs);
  return ora ? `mancano ${residuo} · scade alle ${ora}` : `mancano ${residuo}`;
}

/**
 * Il conteggio leggibile dei membri: «2 di 4» **solo** se `numero_partecipanti`
 * c'è e supera i membri ricevuti, altrimenti solo il numero dei membri. La UI non
 * scrive mai «quattro»: legge quello che il backend manda.
 */
export function testoConteggio(gruppo) {
  const ricevuti = membriInOrdine(gruppo?.membri).length;
  const totale = gruppo?.numeroPartecipanti;
  if (Number.isInteger(totale) && totale > ricevuti) {
    return `${ricevuti} di ${totale}`;
  }
  return String(ricevuti);
}

/** Il testo di una voce per le frasi accessibili: categoria, mansione e modalità. */
function testoVoce(voce, categorie) {
  if (!voce) {
    return null;
  }
  const categoria = nomeCategoria(categorie, voce.idCategoria) ?? 'categoria non disponibile';
  const mansione = voce.mansione.trim() || 'mansione non indicata';
  return `${categoria}: ${mansione} (${etichettaModalita(voce.daRemoto)})`;
}

/**
 * Una frase sola che riassume il gruppo: è l'etichetta della **regione viva**
 * dello stato, così il passaggio a «pronto» o «saltata» viene annunciato una
 * volta sola quando accade. Il nome dell'utente autenticato diventa «tu».
 */
export function descriviGruppo(gruppo, categorie = []) {
  if (!gruppo) {
    return '';
  }
  const stato = etichettaStatoGruppo(gruppo.stato);
  const elenco = membriInOrdine(gruppo.membri);
  const nomi = elenco
    .map((membro) => (membro.sonoIo ? 'tu' : nomePersona(membro.persona)))
    .join(', ');
  const parti = [stato ? `Catena: ${stato}` : 'Catena'];
  if (nomi) {
    parti.push(nomi);
  }
  const categorieInCatena = elenco
    .map((membro) => nomeCategoria(categorie, membro.offerta?.idCategoria))
    .filter(Boolean);
  if (categorieInCatena.length > 0) {
    parti.push(categorieInCatena.join(', '));
  }
  return parti.join('. ');
}

/**
 * Una frase sola per un membro: persona, cosa offre, il verso della catena (se
 * il backend l'ha dichiarato) e cosa cerca. È l'etichetta accessibile della
 * riga, invece di sei frammenti da comporre.
 */
export function descriviMembro(membro, categorie = [], membri = []) {
  if (!membro) {
    return '';
  }
  const nome = membro.sonoIo ? 'Tu' : nomePersona(membro.persona);
  const offerta = testoVoce(membro.offerta, categorie);
  const destinatario = versoCatena(membro, membri);
  const nomeDestinatario = destinatario
    ? destinatario.sonoIo
      ? 'te'
      : nomePersona(destinatario.persona)
    : null;
  const ricerca = testoVoce(membro.ricerca, categorie);

  const frasi = [offerta ? `${nome} offre ${offerta}` : `${nome} non ha una offerta`];
  if (nomeDestinatario) {
    frasi.push(`a ${nomeDestinatario}`);
  }
  const testa = frasi.join(', ');
  return ricerca ? `${testa}. Cerca ${ricerca}.` : `${testa}.`;
}

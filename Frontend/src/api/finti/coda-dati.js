/**
 * Finti: il **mondo** della catena — chi sono i membri, come si compone il
 * cerchio e com'è fatto lo storico.
 *
 * È separato da `coda.js` (deposito e sceneggiatura) perché è un'altra cosa: qui
 * si costruiscono i dati finti, là si decide *quando* cambiarli. Nessuna
 * persistenza e nessun timer vivono in questo file.
 *
 * Il finto **non inventa un mondo nuovo**: i membri sono le persone del catalogo
 * (id 101–112), lette in sola lettura, e le mie voci arrivano da `servizi.js`.
 * Ma soprattutto **compone un cerchio che rispetta la regola**: l'offerta di
 * ognuno soddisfa la ricerca del successivo. Non prende le prime tre persone del
 * catalogo: le sceglie in modo che la catena che si vede a schermo abbia senso.
 */

import { elencoServiziFinti } from './catalogo';
import { ottieniVoci } from './servizi';

/**
 * Una ricerca plausibile per **categoria**: serve a far tornare i conti del
 * cerchio (l'offerta di uno soddisfa la ricerca del successivo) senza inventare
 * un testo a caso. La chiave è l'id della categoria, gli stessi di
 * `finti/categorie.js`.
 * TODO(backend): la ricerca di ogni persona arriva dentro il membro (campo
 * `cerca`) dalla risposta di `Match/coda.php`: qui è un segnaposto.
 */
const RICERCHE_PER_CATEGORIA = {
  1: { mansione: 'Ripetizioni di matematica', da_remoto: false },
  2: { mansione: 'Montaggio di due armadi', da_remoto: false },
  3: { mansione: 'Riparazione del portatile di casa', da_remoto: true },
  4: { mansione: 'Potatura di due siepi', da_remoto: false },
  5: { mansione: 'Pulizie di fine trasloco', da_remoto: false },
  6: { mansione: 'Aiuto con un foglio di calcolo', da_remoto: true },
  7: { mansione: 'Foto per il curriculum', da_remoto: false },
  8: { mansione: 'Traduzione di un contratto', da_remoto: true },
  9: { mansione: 'Tinteggiatura di una stanza', da_remoto: false },
  10: { mansione: 'Qualcuno che tenga il gatto nel weekend', da_remoto: false },
};

/** L'id della ricerca finta: stabile per persona, così non cambia a ogni lettura. */
const BASE_ID_RICERCA = 2000;

/** La categoria di una voce come numero (le voci la portano già come id). */
function categoriaDi(voce) {
  return voce && voce.id_categoria !== null && voce.id_categoria !== undefined
    ? Number(voce.id_categoria)
    : null;
}

/** Una ricerca finta per categoria, o `null` se la categoria non la conosciamo. */
function ricercaPerCategoria(categoriaId, id) {
  const testo = RICERCHE_PER_CATEGORIA[categoriaId];
  if (!testo) {
    return null;
  }
  return {
    id,
    tipo: 'RICERCA',
    id_categoria: Number(categoriaId),
    mansione: testo.mansione,
    da_remoto: testo.da_remoto,
    localita: '',
    stato: 'PUBBLICATA',
  };
}

/** La voce nella riga di rete, a partire dal deposito delle mie voci. */
function voceRete(riga, tipo) {
  return { ...riga, tipo, stato: riga.stato ?? 'PUBBLICATA' };
}

/** Il membro che sono io; la ricerca può mancare (una voce sola non fa il match). */
function membroUtente(utenteId, offerta, ricerca) {
  return {
    utente_id: Number(utenteId),
    username: '',
    nome: '',
    cognome: '',
    localita: '',
    offre: voceRete(offerta, 'OFFERTA'),
    cerca: ricerca ? voceRete(ricerca, 'RICERCA') : null,
  };
}

/** Un membro a partire da un servizio del catalogo: la ricerca gliela passa il chiamante. */
function membroDaServizio(servizio, ricerca) {
  return {
    utente_id: servizio.offerente.id,
    username: servizio.offerente.username,
    nome: servizio.offerente.nome,
    cognome: servizio.offerente.cognome,
    localita: servizio.offerente.localita,
    offre: {
      id: servizio.id,
      tipo: 'OFFERTA',
      id_categoria: servizio.id_categoria,
      mansione: servizio.mansione,
      da_remoto: servizio.da_remoto,
      localita: servizio.localita,
      stato: servizio.stato,
    },
    cerca: ricerca ?? null,
  };
}

/**
 * I **tre** membri del catalogo, scelti per chiudere il cerchio.
 *
 * La catena ha questa forma (io per primo):
 *
 * ```
 * me.offerta = X.ricerca   X.offerta = Y.ricerca
 * Y.offerta  = Z.ricerca   Z.offerta = me.ricerca
 * ```
 *
 * Quindi `Z` è una persona che **offre quello che io cerco** (il mio arco
 * entrante: è con lei che parlo per primo), `X` è quella a cui offro io, e `Y`
 * sta in mezzo. Le ricerche di X, Y e Z sono **costruite da questa regola**, non
 * pescate a caso: è il motivo per cui la catena si legge con un senso.
 *
 * Quando possibile si evitano le ripetizioni: nessuno cerca esattamente ciò che
 * offre, e due membri non offrono la stessa cosa.
 */
function membriCatalogo(offerte, ricerche) {
  const servizi = elencoServiziFinti();
  const miaOfferta = categoriaDi(offerte?.[0]);
  const miaRicerca = categoriaDi(ricerche?.[0]);
  const usati = new Set();
  const categorieUsate = new Set();

  const scegli = (predicato, daEvitare = []) => {
    const vietate = new Set(daEvitare);
    const liberi = servizi.filter((servizio) => !usati.has(servizio.offerente.id));
    const scelto =
      liberi.find(
        (servizio) =>
          predicato(servizio) &&
          !vietate.has(categoriaDi(servizio)) &&
          !categorieUsate.has(categoriaDi(servizio)),
      ) ??
      liberi.find((servizio) => predicato(servizio) && !vietate.has(categoriaDi(servizio))) ??
      liberi.find((servizio) => predicato(servizio)) ??
      null;
    if (scelto) {
      usati.add(scelto.offerente.id);
      categorieUsate.add(categoriaDi(scelto));
    }
    return scelto;
  };

  // Z offre ciò che cerco io: il mio arco entrante. X e Y riempiono il cerchio.
  const z = miaRicerca !== null ? scegli((servizio) => categoriaDi(servizio) === miaRicerca) : null;
  const x = scegli(
    (servizio) => categoriaDi(servizio) !== miaOfferta,
    [miaOfferta],
  );
  const y = scegli(
    (servizio) => categoriaDi(servizio) !== categoriaDi(x),
    [categoriaDi(x)],
  );

  const membri = [];
  if (x) {
    membri.push({
      servizio: x,
      ricerca:
        miaOfferta !== null
          ? ricercaPerCategoria(miaOfferta, BASE_ID_RICERCA + x.offerente.id)
          : null,
    });
  }
  if (y) {
    membri.push({
      servizio: y,
      ricerca: x ? ricercaPerCategoria(categoriaDi(x), BASE_ID_RICERCA + y.offerente.id) : null,
    });
  }
  if (z) {
    membri.push({
      servizio: z,
      ricerca: y ? ricercaPerCategoria(categoriaDi(y), BASE_ID_RICERCA + z.offerente.id) : null,
    });
  }
  return membri;
}

/** I membri della catena in ordine, con la posizione: io per primo, poi gli altri. */
export function componiMembri(utenteId, quanti) {
  const voci = ottieniVoci(utenteId);
  const base = [];
  if (voci.offerte?.[0]) {
    base.push(membroUtente(utenteId, voci.offerte[0], voci.ricerche?.[0] ?? null));
  }
  membriCatalogo(voci.offerte, voci.ricerche).forEach(({ servizio, ricerca }) => {
    base.push(membroDaServizio(servizio, ricerca));
  });
  return base.slice(0, Math.max(1, quanti)).map((membro, indice) => ({
    ...membro,
    posizione: indice + 1,
  }));
}

/** Tutti i posti previsti per la catena: è il totale che la UI mostra come «2 di N». */
export function totalePartecipanti(utenteId) {
  return componiMembri(utenteId, Number.MAX_SAFE_INTEGER).length;
}

/**
 * Chiude il cerchio: ogni membro punta al successivo, l'ultimo al primo. Da
 * chiamare **solo** con la catena completa, altrimenti il verso non esiste ancora
 * (e la UI non deve disegnare frecce).
 */
export function conVersi(membri) {
  return membri.map((membro, indice) => {
    const dopo = membri[(indice + 1) % membri.length];
    return { ...membro, offre_a: { posizione: dopo.posizione, utente_id: dopo.utente_id } };
  });
}

/**
 * Vero quando la regola è rispettata da tutti: l'offerta di ognuno soddisfa la
 * ricerca del successivo. Se non lo è — per esempio perché manca una categoria nel
 * catalogo — i versi **non** si disegnano: meglio nessuna freccia di una freccia
 * sbagliata (la UI ha già la vista «senza versa», con la riga che lo spiega).
 */
function cerchioCoerente(membri) {
  if (membri.length < 2) {
    return false;
  }
  return membri.every((membro, indice) => {
    const dopo = membri[(indice + 1) % membri.length];
    return categoriaDi(membro.offre) === categoriaDi(dopo.cerca);
  });
}

/** I versi della catena solo se la regola è rispettata; altrimenti i membri e basta. */
function conVersiSeCoerente(membri) {
  return cerchioCoerente(membri) ? conVersi(membri) : membri;
}

/** Data/ora del backend nella forma che `formattaData` sa leggere. */
export function adessoBackend() {
  const data = new Date();
  const due = (numero) => String(numero).padStart(2, '0');
  return (
    `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())} ` +
    `${due(data.getHours())}:${due(data.getMinutes())}:${due(data.getSeconds())}`
  );
}

/** La riga di uscita presa da un membro, con quando e motivo. */
export function uscitaDaMembro(membro, quando, motivo = null) {
  return {
    utente_id: membro?.utente_id ?? null,
    username: membro?.username ?? '',
    nome: membro?.nome ?? '',
    cognome: membro?.cognome ?? '',
    quando,
    motivo,
  };
}

/** Il primo membro che non sono io: è chi «si ritira» nella sceneggiatura. */
function membroCheSiRitira(membri, utenteId) {
  return (
    membri.find((membro) => Number(membro.utente_id) !== Number(utenteId)) ?? membri[0] ?? null
  );
}

export function gruppoInFormazione(utenteId, quanti) {
  return {
    id: `finto-${utenteId}`,
    stato: 'IN_FORMAZIONE',
    numero_partecipanti: totalePartecipanti(utenteId),
    membri: componiMembri(utenteId, quanti),
    uscita: null,
    puoi_chiedere_token: false,
  };
}

export function gruppoPronto(utenteId) {
  const totale = totalePartecipanti(utenteId);
  return {
    id: `finto-${utenteId}`,
    stato: 'PRONTO',
    numero_partecipanti: totale,
    membri: conVersiSeCoerente(componiMembri(utenteId, totale)),
    uscita: null,
    puoi_chiedere_token: false,
  };
}

export function gruppoAnnullato(utenteId) {
  const membri = conVersiSeCoerente(componiMembri(utenteId, totalePartecipanti(utenteId)));
  const uscito = membroCheSiRitira(membri, utenteId);
  return {
    id: `finto-${utenteId}`,
    stato: 'ANNULATO',
    numero_partecipanti: membri.length,
    membri,
    uscita: uscitaDaMembro(uscito, adessoBackend()),
    // Il diritto al token lo dichiara il backend (`puoi_chiedere_token` /
    // `mia_parte_svolta`): **solo chi ha dato il proprio servizio ma non ha
    // ricevuto quello che cercava** (decisione del titolare, 17 settembre 2026).
    // Il finto lo dà vero nel caso del ritiro, per far vedere la riga del token:
    // la demo non modella «chi ha già svolto la sua parte», che è un fatto del
    // backend. L'assegnazione resta della staff, dopo la valutazione.
    puoi_chiedere_token: true,
  };
}

/**
 * Lo storico seminato: due voci, così lo stato «storico» è visibile alla prima
 * apertura — una `CONCLUSA` e una `ANNULATO` con `uscita` e il token ammesso (la
 * riga da cui nascerà la richiesta di token).
 * TODO(backend): lo storico arriva da `Match/coda.php` in `gruppi_conclusi[]`.
 */
export function storicoSeminato(utenteId) {
  const membri = conVersiSeCoerente(componiMembri(utenteId, Number.MAX_SAFE_INTEGER));
  const uscito = membroCheSiRitira(membri, utenteId);
  return [
    {
      id: `storia-conclusa-${utenteId}`,
      stato: 'CONCLUSA',
      concluso_il: '2026-09-10 18:20:00',
      numero_partecipanti: membri.length,
      membri,
      uscita: null,
      puoi_chiedere_token: false,
    },
    {
      id: `storia-saltata-${utenteId}`,
      stato: 'ANNULATO',
      concluso_il: '2026-09-05 11:05:00',
      numero_partecipanti: membri.length,
      membri,
      uscita: uscitaDaMembro(uscito, '2026-09-05 11:05:00'),
      puoi_chiedere_token: true,
    },
  ];
}

/**
 * Finti: le **segnalazioni viste dalla staff**.
 *
 * Serve perché `segnalazioni.php` non esiste e senza deposito l'area staff non
 * avrebbe niente da esaminare: la demo deve poter mostrare le tre pratiche (una
 * aperta, una in esame, una chiusa), la presa in carico e la chiusura con esito.
 * È un `Map` per id con copia su `localStorage` (chiave
 * `barattolo.finti.segnalazioni-staff`): sul web una chiusura sopravvive al
 * reload, su native degrada a sola memoria — degradazione dichiarata, come per
 * gli altri finti.
 *
 * Restituisce la **forma di rete** dell'endpoint proposto (`segnalazioni.php`): la
 * normalizzazione è una sola e sta in `api/normalizzazioni.js`, usata da
 * `api/barattolo.js`. A differenza degli altri depositi questo **valida una
 * cosa**: il `409` sull'azione fuori tempo (prendere in carico una pratica già
 * chiusa, chiudere una già chiusa). È l'unico modo di provare a schermo il
 * conflitto — che il piano 11 chiede di mostrare — e resta dichiarato: i finti
 * non proteggono niente, riproducono una sceneggiatura.
 *
 * Il **seme** è la sceneggiatura della demo, non dati reali: la prima pratica è
 * segnalata **dall'utente della demo**, così chiudendola con un provvedimento la
 * notifica in-app arriva davvero e — scegliendo «Te» come beneficiario — il buono
 * compare in «I miei token». Senza, la demo non mostrerebbe nessuno dei due
 * effetti (decisione del 18 settembre 2026: il ruolo è finto e dichiarato).
 *
 * `notificaEsito` (`finti/notifiche.js`) è il punto in cui la sceneggiatura
 * diventa visibile all'utente: per ogni esito diverso da «nessun provvedimento»
 * scrive una notifica, e con `TOKEN_ASSEGNATO` crea anche il buono nel deposito
 * del piano 10. L'id del buono torna nella risposta come `id_token`.
 */

import { ApiError } from '../client';
import { ESITI_CHIUSURA } from '@/servizi/staff';
import { adessoBackend } from './coda-dati';
import { notificaEsito } from './notifiche';

const CHIAVE_PERSISTENZA = 'barattolo.finti.segnalazioni-staff';

/** Attesa dichiarata: rende rappresentabili lo stato di caricamento e l'azione in corso. */
const ATTESA_MS = 300;

/** Il deposito: `id -> riga di rete`. Non è per utente: la staff vede tutte le pratiche. */
const deposito = new Map();

let caricato = false;

function localStorageDisponibile() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function leggiPersistito() {
  if (!localStorageDisponibile()) {
    return null;
  }
  try {
    const grezzo = window.localStorage.getItem(CHIAVE_PERSISTENZA);
    return grezzo ? JSON.parse(grezzo) : null;
  } catch (errore) {
    console.warn('Segnalazioni della staff illeggibili: la demo riparte dal seme.', errore);
    return null;
  }
}

function scriviPersistito() {
  if (!localStorageDisponibile()) {
    return;
  }
  const serializzabile = {};
  deposito.forEach((riga, id) => {
    serializzabile[id] = riga;
  });
  try {
    window.localStorage.setItem(CHIAVE_PERSISTENZA, JSON.stringify(serializzabile));
  } catch (errore) {
    console.warn('Impossibile salvare le segnalazioni della staff.', errore);
  }
}

function assicuraCaricato(utenteId) {
  if (caricato) {
    return;
  }
  caricato = true;
  const salvato = leggiPersistito();
  if (salvato && typeof salvato === 'object' && Object.keys(salvato).length > 0) {
    Object.entries(salvato).forEach(([id, riga]) => deposito.set(Number(id), riga));
    return;
  }
  seme(utenteId).forEach((riga) => deposito.set(Number(riga.id), riga));
}

function busta(message, data) {
  return { success: true, message, data };
}

/** Copia della riga: chi la riceve non può modificare quella del deposito. */
function copia(riga) {
  return {
    ...riga,
    autore: riga.autore ? { ...riga.autore } : null,
    segnalato: riga.segnalato ? { ...riga.segnalato } : null,
    partecipanti: Array.isArray(riga.partecipanti)
      ? riga.partecipanti.map((persona) => ({ ...persona }))
      : [],
    esiti: Array.isArray(riga.esiti) ? [...riga.esiti] : null,
  };
}

function persona(id, nome, cognome, username) {
  return { id, nome, cognome, username };
}

/**
 * TODO(backend): il seme è la sceneggiatura della demo, non dati reali. `Tu` è
 * l'utente della demo (il ruolo finto lo rende anche staff): è l'autore della
 * prima pratica, così la notifica e il buono arrivano a chi sta provando l'app.
 */
function seme(utenteId) {
  const idUtente = Number(utenteId);
  const io = persona(
    Number.isInteger(idUtente) ? idUtente : 1,
    'Tu',
    null,
    null,
  );
  const mario = persona(101, 'Mario', 'Rossi', 'mario.rossi');
  const giulia = persona(102, 'Giulia', 'Bianchi', 'giulia.bianchi');
  const luca = persona(103, 'Luca', 'Verdi', 'luca.verdi');
  const anna = persona(104, 'Anna', 'Neri', 'anna.neri');
  const paolo = persona(105, 'Paolo', 'Gialli', 'paolo.gialli');

  return [
    {
      id: 1,
      stato: 'OPEN',
      motivo: 'NON_HA_SVOLTO',
      descrizione:
        'Doveva riparare il rubinetto della cucina sabato mattina: non si è presentato e non ha risposto ai messaggi.',
      autore: io,
      segnalato: mario,
      partecipanti: [io, mario],
      id_gruppo: 12,
      id_accordo: null,
      creato_il: adessoBackend(),
      gestito_da: null,
      esiti: null,
      nota: null,
      chiusa_il: null,
    },
    {
      id: 2,
      stato: 'IN_REVIEW',
      motivo: 'ABBANDONO_GRUPPO',
      descrizione:
        'Ha lasciato il gruppo di scambio due giorni prima della consegna, senza avvisare nessuno.',
      autore: giulia,
      segnalato: luca,
      partecipanti: [giulia, luca],
      id_gruppo: 15,
      id_accordo: null,
      creato_il: adessoBackend(),
      gestito_da: Number.isInteger(idUtente) ? idUtente : 1,
      esiti: null,
      nota: null,
      chiusa_il: null,
    },
    {
      id: 3,
      stato: 'CLOSED',
      motivo: 'LINGUAGGIO_OFFENSIVO',
      descrizione: 'Ha risposto con insulti quando le ho chiesto di spostare l’appuntamento.',
      autore: anna,
      segnalato: paolo,
      partecipanti: [anna, paolo],
      id_gruppo: null,
      id_accordo: 88,
      creato_il: adessoBackend(),
      gestito_da: Number.isInteger(idUtente) ? idUtente : 1,
      esiti: ['UTENTE_SOSPESO'],
      nota: 'Utente sospeso per una settimana.',
      chiusa_il: adessoBackend(),
    },
  ];
}

/**
 * TODO(backend): `GET segnalazioni.php?stato=OPEN|IN_REVIEW|CLOSED` con
 * l'identità **dal token di accesso** e il `403` per chi non è staff. `utenteId`
 * serve perché il finto non decodifica il token (su native `atob` non è
 * garantito), come già fanno gli altri depositi. Senza `stato` torna tutto.
 */
export function ottieniSegnalazioniStaff(utenteId, stato) {
  assicuraCaricato(utenteId);
  const filtro = typeof stato === 'string' && stato.trim() !== '' ? stato.trim().toUpperCase() : null;
  const segnalazioni = [...deposito.values()]
    .filter((riga) => filtro === null || riga.stato === filtro)
    .sort((prima, seconda) => Number(seconda.id) - Number(prima.id))
    .map(copia);
  return new Promise((resolve) => {
    setTimeout(() => resolve(busta('Segnalazioni caricate.', { segnalazioni })), ATTESA_MS);
  });
}

/**
 * TODO(backend): `POST segnalazioni.php {azione:'prendi_in_carico', id}` con
 * l'identità dal token e `409` se la pratica è già presa o chiusa. Il finto
 * riproduce il `409` perché è il conflitto che la schermata deve saper mostrare.
 */
export function prendiInCarico(utenteId, id) {
  assicuraCaricato(utenteId);
  const riga = deposito.get(Number(id));
  if (!riga) {
    throw new ApiError(404, 'Questa segnalazione non esiste più.');
  }
  if (riga.stato !== 'OPEN') {
    throw new ApiError(409, 'Questa segnalazione è già stata presa in carico o chiusa.');
  }
  const aggiornata = { ...riga, stato: 'IN_REVIEW', gestito_da: utenteId ?? null };
  deposito.set(Number(id), aggiornata);
  scriviPersistito();
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(busta('Segnalazione presa in carico.', { segnalazione: copia(aggiornata) })),
      ATTESA_MS,
    );
  });
}

/**
 * TODO(backend): `POST segnalazioni.php {azione:'chiudi', id, esiti,
 * id_beneficiario?, nota}` con l'identità dal token, `400` su un esito non
 * ammesso o una combinazione impossibile e `409` su una pratica già chiusa.
 *
 * Il finto riproduce il `409`; per ogni esito diverso da «nessun provvedimento»
 * scrive la notifica per il segnalante (o, con il token, per il beneficiario
 * scelto) e restituisce `id_token` quando il buono è stato creato.
 */
export function chiudi(utenteId, id, esiti, nota, idBeneficiario = null) {
  assicuraCaricato(utenteId);
  const riga = deposito.get(Number(id));
  if (!riga) {
    throw new ApiError(404, 'Questa segnalazione non esiste più.');
  }
  if (riga.stato === 'CLOSED') {
    throw new ApiError(409, 'Questa segnalazione è già stata chiusa.');
  }

  const scelti = Array.isArray(esiti) ? esiti : [];
  const beneficiario = idBeneficiario ?? riga.autore?.id ?? null;
  let idToken = null;

  scelti.forEach((esito) => {
    if (esito === ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO) {
      return;
    }
    if (esito === ESITI_CHIUSURA.TOKEN_ASSEGNATO) {
      const notifica = notificaEsito(beneficiario, {
        esito,
        origineToken: 'Segnalazione esaminata dalla staff',
      });
      idToken = notifica?.id_token ?? null;
      return;
    }
    notificaEsito(riga.autore?.id, { esito });
  });

  const testoNota = typeof nota === 'string' && nota.trim() !== '' ? nota.trim() : null;
  const aggiornata = {
    ...riga,
    stato: 'CLOSED',
    esiti: scelti,
    nota: testoNota,
    chiusa_il: adessoBackend(),
    gestito_da: utenteId ?? null,
  };
  deposito.set(Number(id), aggiornata);
  scriviPersistito();

  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve(
          busta('Segnalazione chiusa.', { segnalazione: copia(aggiornata), id_token: idToken }),
        ),
      ATTESA_MS,
    );
  });
}

/** Svuota il deposito: comodo per riprovare la demo da zero. */
export function azzeraFinti() {
  deposito.clear();
  caricato = true;
  scriviPersistito();
}

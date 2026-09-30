import { ApiError, apiFetch } from '../client';

/**
 * Area profilo: funzioni e normalizzazioni di `GET /api/profile` e
 * `PATCH /api/profile`.
 *
 * Nasce come primo file di `aree/` (decisione del piano del profilo, P53): le
 * funzioni nuove **non** ingrossano `barattolo.js` o `normalizzazioni.js`, si
 * smistano per area qui dentro e `barattolo.js` le re-espone, così il layer
 * resta un punto unico per le schermate (§3 di `AGENTS.md`).
 */

function testoValorizzato(valore) {
  return typeof valore === 'string' && valore.trim() ? valore : null;
}

/**
 * La busta `{profile: {...}}` del backend nella forma interna della schermata:
 * chiavi italiane dei campi che il profilo mostra più un `null` esplicito per
 * ogni campo assente (mai `undefined`, che tra un render e l'altro fa sparire
 * le righe in modo inuniforme). `immagineProfilo` viene tenuta solo per
 * completezza della forma interna: la schermata **non** la mostra (decisione
 * del piano: servirebbe un lavoro a parte sul rendering).
 */
export function normalizzaProfilo(risposta) {
  const profilo = risposta?.profile;
  if (!profilo || typeof profilo !== 'object') {
    return null;
  }
  return {
    id: typeof profilo.id === 'number' ? profilo.id : null,
    nome: testoValorizzato(profilo.name),
    cognome: testoValorizzato(profilo.surname),
    localita: testoValorizzato(profilo.location),
    username: testoValorizzato(profilo.username),
    email: testoValorizzato(profilo.email),
    bio: testoValorizzato(profilo.bio),
    immagineProfilo: testoValorizzato(profilo.profileImageUrl),
  };
}

/**
 * GET /api/profile — l'unico endpoint che restituisce l'email propria, più
 * località e bio (che nel login e nella registrazione non arrivano).
 *
 * Header `Authorization: Bearer <token>` già allegato da `apiFetch`; un
 * 401 gestisce da solo il logout (il meccanismo di `client.js`), un 403
 * (account inattivo) e gli altri errori arrivano alla schermata come `ApiError`
 * col messaggio del backend, senza traduzioni a mano.
 */
export async function ottieniProfilo(token) {
  return normalizzaProfilo(await apiFetch('profile', { token }));
}

/**
 * PATCH /api/profile — salva le modifiche a località e bio.
 *
 * `modifiche` porta **solo le chiavi effettivamente cambiate** dalla
 * schermata (`{ localita?, bio? }`, con stringhe già trimmate): il corpo si
 * costruisce qui, così ciò che non si tocca non viaggia in rete e il `400
 * «At least one profile field…»` non ha modo di arrivare (decisione del piano).
 * Una stringa vuota significa «svuota il campo»: il backend accetta `null` per
 * `location` e `bio` e il valore svuotato si manda come `null`, non come `""`.
 *
 * La guardia a mano vuota è difensiva: la schermata disabilita «Salva» quando
 * non è cambiato nulla, quindi nessun flusso reale arriva qui senza modifiche.
 * La risposta ha la stessa busta della GET e si normalizza allo stesso modo.
 */
export async function aggiornaProfilo(token, modifiche) {
  const corpo = {};
  if (modifiche && 'localita' in modifiche) {
    corpo.location = testoValorizzato(modifiche.localita);
  }
  if (modifiche && 'bio' in modifiche) {
    corpo.bio = testoValorizzato(modifiche.bio);
  }
  if (Object.keys(corpo).length === 0) {
    throw new ApiError(400, 'Nessuna modifica da salvare.');
  }
  return normalizzaProfilo(
    await apiFetch('profile', { token, method: 'PATCH', body: corpo }),
  );
}

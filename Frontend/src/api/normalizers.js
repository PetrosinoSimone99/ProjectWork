import { STATI_PUBBLICAZIONE, TIPI_VOCE } from '@/services/offer-request';

/**
 * Normalisers: from the backend wire shape to the shape the screens read.
 *
 * They live here and not inside the endpoint modules because they are pure:
 * copy, transform, return — no network, no mutation of the input, and every
 * function drops a row the UI could not show instead of drawing an empty one.
 *
 * Italian field names inside the returned objects (`descrizione`, `categorie`,
 * `offerente`, `mansione`, `stato`) are the UI shape the surviving components
 * already read (see `docs/frontend.md`, §Language rules). They are renamed
 * together with the component that consumes them, not before: a rename that
 * lands on one side only is two shapes in the same app.
 */

/** Integer or `null` for a missing or non-numeric value. */
export function toIntegerOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

/** Trimmed, non-empty string or `null`. */
export function toTextOrNull(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * The backend roles (`User::ROLE_*`) in the two words the UI understands, most
 * privileged first. An unknown role is not translated and leaves `role` null:
 * the staff entry stays hidden (fail closed).
 */
const INTERNAL_ROLES = [
  { wire: 'ROLE_STAFF', role: 'STAFF' },
  { wire: 'ROLE_USER', role: 'USER' },
];

function roleFromRoles(roles) {
  for (const entry of INTERNAL_ROLES) {
    if (roles.includes(entry.wire)) {
      return entry.role;
    }
  }
  return null;
}

/**
 * A user from the auth response (`User::toApiArray`).
 * `accountStatus` stays raw (`ACTIVE`/`INACTIVE`): translating it here would be
 * an invented equivalence; the screen maps it for display.
 */
function normalizeAuthUser(user) {
  if (user === null || typeof user !== 'object') {
    return null;
  }
  const roles = Array.isArray(user.roles) ? [...user.roles] : [];
  return {
    id: toIntegerOrNull(user.id),
    nome: typeof user.name === 'string' ? user.name : '',
    cognome: typeof user.surname === 'string' ? user.surname : '',
    username: typeof user.username === 'string' ? user.username : '',
    email: typeof user.email === 'string' ? user.email : '',
    localita: toTextOrNull(user.location),
    ruoli: roles,
    ruolo: roleFromRoles(roles),
    stato: typeof user.accountStatus === 'string' ? user.accountStatus : null,
    bio: toTextOrNull(user.bio),
    immagineProfilo: toTextOrNull(user.profileImageUrl),
  };
}

/**
 * Login and registration answer `{token, user, offers?, requests?}`.
 * Returns `{token, utente}`: the session shape the auth context stores.
 */
export function normalizeAuthResponse(response) {
  return {
    token: typeof response?.token === 'string' ? response.token : null,
    utente: normalizeAuthUser(response?.user),
  };
}

/**
 * `GET /profile` -> the editable profile in the UI shape.
 * Absent optional fields become explicit `null`, never `undefined`: a key that
 * disappears between renders makes rows vanish unevenly.
 */
export function normalizeProfile(response) {
  const profile = response?.profile;
  if (!profile || typeof profile !== 'object') {
    return null;
  }
  return {
    id: toIntegerOrNull(profile.id),
    nome: toTextOrNull(profile.name),
    cognome: toTextOrNull(profile.surname),
    localita: toTextOrNull(profile.location),
    username: toTextOrNull(profile.username),
    email: toTextOrNull(profile.email),
    bio: toTextOrNull(profile.bio),
    immagineProfilo: toTextOrNull(profile.profileImageUrl),
  };
}

/**
 * Italian display labels for the categories observed in the database. A new,
 * unmapped category is shown as the raw description: no invented translation.
 */
const CATEGORY_LABELS = {
  Cleaning: 'Pulizie',
  Cooking: 'Cucina',
  Gardening: 'Giardinaggio',
  Languages: 'Lingue',
  Repairs: 'Riparazioni',
};

function categoryLabel(text) {
  const raw = toTextOrNull(text);
  if (raw === null) {
    return null;
  }
  return CATEGORY_LABELS[raw] ?? raw;
}

/** `GET /categories` -> `[{id, nome}]`, rows without id or label dropped. */
export function normalizeCategories(response) {
  const list = response?.categories;
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((category) => ({
      id: Number(category?.id),
      nome: categoryLabel(category?.description) ?? '',
    }))
    .filter((category) => Number.isInteger(category.id) && category.nome !== '');
}

/** An `owner`/`offerente` object of a catalog row. */
/**
 * A `{id,name,surname,username,location,bio,profileImageUrl}` object in the UI
 * shape (`nome`, `cognome`, `localita`, `immagineProfilo`). Shared by the owner
 * of a service row and by the `user` envelope of `GET /users/{id}/services`,
 * which carry the same seven fields.
 */
function normalizePersonFields(source) {
  const inside = source && typeof source === 'object' ? source : {};
  return {
    id: toIntegerOrNull(inside.id),
    username: toTextOrNull(inside.username),
    nome: toTextOrNull(inside.name),
    cognome: toTextOrNull(inside.surname),
    localita: toTextOrNull(inside.location),
    bio: toTextOrNull(inside.bio),
    immagineProfilo: toTextOrNull(inside.profileImageUrl),
  };
}

function normalizeOwner(row) {
  const source = row?.owner ?? row?.offerente;
  return normalizePersonFields(source);
}

/** `pagination` -> `{pagina, limite, elementiTotali, pagineTotali}`. */
export function normalizePagination(pagination) {
  return {
    pagina: toIntegerOrNull(pagination?.page),
    limite: toIntegerOrNull(pagination?.limit),
    elementiTotali: toIntegerOrNull(pagination?.totalItems),
    pagineTotali: toIntegerOrNull(pagination?.totalPages),
  };
}

/**
 * One `offers[]` row of `GET /services`. Rows without a description are
 * dropped (the contract guarantees one), and `categories` becomes
 * `[{id, nome}]` so the card and the detail never read backend keys.
 *`isRemote` becomes `daRemoto`, `location` becomes `localita` (the location of
 * the *service*), `createdAt` becomes `pubblicatoIl`.
 */
export function normalizeCatalogOffer(row, index = 0) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const descrizione = toTextOrNull(row.description);
  if (descrizione === null) {
    return null;
  }
  const id = toIntegerOrNull(row.id);
  const categorie = Array.isArray(row.categories)
    ? row.categories
        .map((category) => ({
          id: toIntegerOrNull(category?.id),
          nome: categoryLabel(category?.description) ?? '',
        }))
        .filter((category) => category.id !== null && category.nome !== '')
    : [];
  return {
    chiave: id === null ? `offerta-riga-${index}` : `offerta-${id}`,
    id,
    tipo: typeof row.type === 'string' ? row.type.trim().toUpperCase() : '',
    descrizione,
    daRemoto: row.isRemote === true,
    localita: toTextOrNull(row.location),
    categorie,
    offerente: normalizeOwner(row),
    pubblicatoIl: toTextOrNull(row.createdAt),
  };
}

/**
 * `GET /services` -> `{elenco, paginazione}`.
 * The viewer's own rows never enter the catalog: the backend query excludes
 * them, but this decision belongs to the client and is enforced here too.
 */
export function normalizeCatalog(response, viewerId) {
  const list = Array.isArray(response?.offers) ? response.offers : [];
  return {
    elenco: list
      .map((row, index) => {
        const offer = normalizeCatalogOffer(row, index);
        if (!offer) {
          return null;
        }
        if (offer.offerente.id !== null && Number(offer.offerente.id) === Number(viewerId)) {
          return null;
        }
        return offer;
      })
      .filter(Boolean),
    paginazione: normalizePagination(response?.pagination),
  };
}

/**
 * One of the viewer's own services (`GET /offers/mine`, `/requests/mine`, and
 * the answer of create/update/restore). The UI shape is the one the
 * offer-and-request screen already reads: `type -> tipo`,
 * `description -> mansione`, `categories -> idCategoria` (the form allows one)
 * plus `categoryIds` with all of them, kept for the service form and for any
 * future multi-category UI (the home no longer ranks locally: D021).
 * `isSuspended -> stato` (`PUBBLICATA`/`SOSPESA`).
 */
export function normalizeOwnedService(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const type =
    row.type === 'OFFER' ? TIPI_VOCE.OFFERTA : row.type === 'REQUEST' ? TIPI_VOCE.RICERCA : null;
  const id = toIntegerOrNull(row.id);
  if (type === null || id === null) {
    return null;
  }
  const categories = Array.isArray(row.categories) ? row.categories : [];
  const categoryIds = categories
    .map((category) => toIntegerOrNull(category?.id))
    .filter((categoryId) => categoryId !== null);
  return {
    chiave: `${type}-${id}`,
    tipo: type,
    id,
    idCategoria: categoryIds.length > 0 ? categoryIds[0] : null,
    categoryIds,
    mansione: typeof row.description === 'string' ? row.description : '',
    daRemoto: row.isRemote === true,
    localita: typeof row.location === 'string' ? row.location : '',
    stato:
      row.isSuspended === true
        ? STATI_PUBBLICAZIONE.SOSPESA
        : STATI_PUBBLICAZIONE.PUBBLICATA,
    eliminataIl: toTextOrNull(row.deletedAt),
  };
}

/**
 * The two answers of the own-services list (`{offers: [...]}`,
 * `{requests: [...]}`) in a single list. Rows the UI cannot show are dropped;
 * the order stays the backend's (newest first).
 */
export function normalizeOwnedServices(offersResponse, requestsResponse) {
  const rows = [
    ...(Array.isArray(offersResponse?.offers) ? offersResponse.offers : []),
    ...(Array.isArray(requestsResponse?.requests) ? requestsResponse.requests : []),
  ];
  return rows.map(normalizeOwnedService).filter(Boolean);
}

/** The single row of a create/update/restore answer (`{service|offer|request}`). */
export function normalizeServiceEnvelope(response) {
  return normalizeOwnedService(response?.service ?? response?.offer ?? response?.request);
}

/** `POST /reports` -> the created report, without inventing fields. */
export function normalizeUserReport(response) {
  const report = response?.report ?? response;
  if (!report || typeof report !== 'object') {
    return null;
  }
  return {
    id: toIntegerOrNull(report.id),
    reportedUserId: toIntegerOrNull(report.reportedUserId),
    reason: typeof report.reason === 'string' ? report.reason : '',
    createdAt: toTextOrNull(report.createdAt),
  };
}

/** A person embedded in a staff row: `{id, username, nome, cognome}`. */
function normalizePerson(value) {
  if (!value || typeof value !== 'object') {
    return { id: null, username: null, nome: null, cognome: null };
  }
  return {
    id: toIntegerOrNull(value.id),
    username: toTextOrNull(value.username),
    nome: toTextOrNull(value.name),
    cognome: toTextOrNull(value.surname),
  };
}

/**
 * A staff-visible user (`GET /staff/users`). `role` is the internal word
 * (`STAFF`/`USER`), `accountStatus` stays raw (`ACTIVE`/`INACTIVE`).
 */
export function normalizeStaffUser(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const id = toIntegerOrNull(row.id);
  if (id === null) {
    return null;
  }
  const roles = Array.isArray(row.roles) ? [...row.roles] : [];
  return {
    id,
    username: toTextOrNull(row.username),
    nome: toTextOrNull(row.name),
    cognome: toTextOrNull(row.surname),
    email: toTextOrNull(row.email),
    ruoli: roles,
    ruolo: roleFromRoles(roles),
    stato: typeof row.accountStatus === 'string' ? row.accountStatus : null,
  };
}

/** `GET /staff/users` -> `{utenti, paginazione}`. */
export function normalizeStaffUsers(response) {
  const list = Array.isArray(response?.users) ? response.users : [];
  return {
    utenti: list.map(normalizeStaffUser).filter(Boolean),
    paginazione: normalizePagination(response?.pagination),
  };
}

/**
 * A report as the staff sees it (`UserReport::toStaffApiArray`): the reason,
 * who reported whom, the review status and the review trail.
 */
export function normalizeStaffReport(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const id = toIntegerOrNull(row.id);
  if (id === null) {
    return null;
  }
  return {
    id,
    motivo: typeof row.reason === 'string' ? row.reason : '',
    creataIl: toTextOrNull(row.createdAt),
    autore: normalizePerson(row.reporter),
    segnalato: normalizePerson(row.reportedUser),
    stato: typeof row.status === 'string' ? row.status.trim().toUpperCase() : null,
    assegnataA: normalizePerson(row.assignedTo),
    assegnataIl: toTextOrNull(row.assignedAt),
    nota: toTextOrNull(row.reviewNote),
    rivistaDa: normalizePerson(row.reviewedBy),
    rivistaIl: toTextOrNull(row.reviewedAt),
  };
}

/** `GET /staff/reports` -> `{segnalazioni, paginazione}`. */
export function normalizeStaffReports(response) {
  const list = Array.isArray(response?.reports) ? response.reports : [];
  return {
    segnalazioni: list.map(normalizeStaffReport).filter(Boolean),
    paginazione: normalizePagination(response?.pagination),
  };
}

/** `GET /staff/operations` -> `{operazioni, paginazione}` in a flat UI shape. */
export function normalizeStaffOperations(response) {
  const list = Array.isArray(response?.operations) ? response.operations : [];
  return {
    operazioni: list
      .map((operation) => {
        const id = toIntegerOrNull(operation?.id);
        if (id === null) {
          return null;
        }
        const target = operation.target && typeof operation.target === 'object' ? operation.target : {};
        const actor = operation.actor && typeof operation.actor === 'object' ? operation.actor : {};
        return {
          id,
          azione: toTextOrNull(operation.action),
          bersaglio: toTextOrNull(target.type),
          bersaglioId: toIntegerOrNull(target.id),
          staff: { id: toIntegerOrNull(actor.id), username: toTextOrNull(actor.username) },
          creataIl: toTextOrNull(operation.createdAt),
        };
      })
      .filter(Boolean),
    paginazione: normalizePagination(response?.pagination),
  };
}

/**
 * `GET /staff/services/deleted` -> `{servizi, paginazione}`.
 *
 * Ogni riga e' un servizio di chiunque (`normalizeOwnedService`, con
 * `eliminataIl` gia' dentro) piu' il suo proprietario: senza di lui le righe
 * della lista sarebbero indistinguibili. `normalizePerson` e' privata di
 * questo modulo, quindi il normalizzatore vive qui e non in `areas/staff.js`.
 */
export function normalizeStaffDeletedServices(response) {
  const list = Array.isArray(response?.services) ? response.services : [];
  return {
    servizi: list
      .map((row) => {
        const service = normalizeOwnedService(row);
        if (!service) {
          return null;
        }
        return {
          ...service,
          // La riga wire porta i nomi delle categorie; `normalizeOwnedService`
          // tiene solo gli id perché il form ne ammette una. Qui serve il nome.
          categoriaNome: categoryLabel(row?.categories?.[0]?.description),
          proprietario: normalizePerson(row?.owner),
        };
      })
      .filter(Boolean),
    paginazione: normalizePagination(response?.pagination),
  };
}

/**
 * `GET /staff/operations/{id}` -> una voce del registro col suo dettaglio.
 *
 * La riga di lista e' la stessa (`normalizeStaffOperations`), piu' `before` e
 * `after`: esistono solo qui, la lista non li porta, e restano `null` quando
 * l'operazione non ne ha (`?? null`, perche' `undefined` in UI e' un campo
 * mancante, non un valore assente).
 */
export function normalizeStaffOperation(response) {
  const operation = response?.operation;
  if (!operation || typeof operation !== 'object') {
    return null;
  }
  const id = toIntegerOrNull(operation.id);
  if (id === null) {
    return null;
  }
  const target = operation.target && typeof operation.target === 'object' ? operation.target : {};
  const actor = operation.actor && typeof operation.actor === 'object' ? operation.actor : {};
  return {
    id,
    azione: toTextOrNull(operation.action),
    bersaglio: toTextOrNull(target.type),
    bersaglioId: toIntegerOrNull(target.id),
    staff: { id: toIntegerOrNull(actor.id), username: toTextOrNull(actor.username) },
    creataIl: toTextOrNull(operation.createdAt),
    prima: operation.before ?? null,
    dopo: operation.after ?? null,
  };
}

/**
 * One row of `agreementProposal`: a participant of an agreement with their
 * role (`Provider`/`Beneficiary`, kept raw like every other wire word) and
 * their answer — `true`/`false`, `null` while they have not answered yet.
 * Rows without a username cannot identify anyone and are dropped.
 */
function normalizeAgreementProposal(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const username = toTextOrNull(row.username);
  if (username === null) {
    return null;
  }
  return {
    username,
    ruolo: toTextOrNull(row.role),
    risposta: typeof row.response === 'boolean' ? row.response : null,
    dataRisposta: toTextOrNull(row.responseDate),
  };
}

/**
 * The delivery sheet rows of an agreement (`agreementDetails`): read-only data
 * the backend fills. Each participant gets their own row, so an accepted
 * agreement carries two of them; the screens pick the one that belongs to the
 * viewer (`services/agreements.js`). An empty array means the sheet does not
 * exist yet, which the screens draw as "Scheda non compilata".
 *
 * The wire keys are the ones `AgreementDetailsDTO` serialises
 * (`providerUsername`, `serviceDescription`, `beneficiaryUsername`), not the
 * getter names without the prefix. A row with no service description names no
 * service, so it is treated as no sheet at all: the card must not claim
 * "Servizio non indicato" over a sheet that does exist.
 */
function normalizeAgreementSheet(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const descrizione = toTextOrNull(row.serviceDescription);
  if (descrizione === null) {
    return null;
  }
  return {
    username: toTextOrNull(row.providerUsername),
    descrizione,
    beneficiario: toTextOrNull(row.beneficiaryUsername),
    daRemoto: typeof row.fromRemote === 'boolean' ? row.fromRemote : null,
    inizio: toTextOrNull(row.startDate),
    fine: toTextOrNull(row.endDate),
    beneficiarioAccettato:
      typeof row.beneficiaryAccepted === 'boolean' ? row.beneficiaryAccepted : null,
    stato: typeof row.status === 'string' ? row.status.trim().toUpperCase() : null,
  };
}

/**
 * One row of `GET /get-agreements`, the same shape for both participants:
 * `{id, stato, creazione, proposte: [{username, ruolo, risposta,
 * dataRisposta}], scheda: null | {...}, schede: [...]}`.
 *
 * `stato` stays the raw wire word
 * (`PENDING`/`ACCEPTED`/`REFUSED`/`CONTESTED`/`VOID`): the screens map it to
 * Italian display copy, this layer does not decide display. A row without an
 * id cannot be answered or cancelled, so it is dropped like every other row
 * the UI could not act on; a malformed row returns `null` instead of throwing
 * (the file is tolerant by design).
 *
 * `schede` keeps **every** sheet row, because an accepted agreement has one per
 * participant and the card must show the viewer's. `scheda` remains the first
 * one: classification needs one end date, and keeping the old field means the
 * existing consumers do not change.
 */
export function normalizeAgreement(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const id = toIntegerOrNull(row.id);
  if (id === null) {
    return null;
  }
  const proposte = Array.isArray(row.agreementProposal) ? row.agreementProposal : [];
  const dettagli = Array.isArray(row.agreementDetails) ? row.agreementDetails : [];
  const schede = dettagli.map(normalizeAgreementSheet).filter(Boolean);
  return {
    id,
    stato:
      typeof row.agreementStatus === 'string'
        ? row.agreementStatus.trim().toUpperCase()
        : null,
    creazione: toTextOrNull(row.creationDate),
    proposte: proposte.map(normalizeAgreementProposal).filter(Boolean),
    scheda: schede.length > 0 ? schede[0] : null,
    schede,
  };
}

/**
 * `GET /get-agreements` -> `[{...}]`, read from `response.success.agreements`.
 * An absent or malformed list is an empty array, never a throw: a new account
 * simply has no agreements yet.
 */
export function normalizeAgreements(response) {
  const list = response?.success?.agreements;
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(normalizeAgreement).filter(Boolean);
}

/**
 * One `notifications[]` row of `GET /notifications`.
 *
 * `tipo` stays the raw backend string (`AGREEMENT_PROPOSAL`, `CHAT_MESSAGE`, …):
 * the label and the icon are a presentation decision the screen makes, and the
 * backend's `type` is free-form, with one known inconsistency (`COMPLETED`
 * events are written lowercase by the scheduler), so it is upper-cased here
 * once instead of in every consumer.
 *
 * `dati` is the backend's `data` object kept verbatim (it carries `agreementId`
 * and friends, whose shape depends on the type); `letta` is the boolean the UI
 * actually reads, derived from `readAt`, because a timestamp is never what a
 * row asks.
 */
export function normalizeNotification(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const id = toIntegerOrNull(row.id);
  if (id === null) {
    return null;
  }
  const tipo = toTextOrNull(row.type);
  return {
    id,
    tipo: tipo === null ? null : tipo.toUpperCase(),
    messaggio: toTextOrNull(row.message),
    dati: row.data && typeof row.data === 'object' ? row.data : null,
    creataIl: toTextOrNull(row.createdAt),
    lettaIl: toTextOrNull(row.readAt),
    letta: toTextOrNull(row.readAt) !== null,
  };
}

/**
 * `GET /notifications` -> `{elementi, paginazione, nonLette}`.
 * A missing list is an empty page, never a throw: an account with no
 * notifications is the normal case, not an error.
 */
export function normalizeNotifications(response) {
  const rows = Array.isArray(response?.notifications) ? response.notifications : [];
  return {
    elementi: rows.map(normalizeNotification).filter(Boolean),
    paginazione: normalizePagination(response?.pagination),
    nonLette: toIntegerOrNull(response?.unreadCount) ?? 0,
  };
}

/**
 * `GET /users/{id}/services` -> `{utente, offerte, richieste}`.
 *
 * The envelope is the only endpoint that returns a public profile together with
 * that person's services, so the mini-card in the service detail reads it in one
 * call. Every service row has the shape `GET /services` already sends, so it
 * goes through `normalizeCatalogOffer` and gets the envelope's `user` attached
 * as its owner: the person IS the offerer of every row here, and leaving that
 * field empty would make the mini-card re-fetch it.
 *
 * A row without a description is dropped, like everywhere else: the card has
 * nothing to draw without one.
 */
export function normalizeUserServices(response) {
  const utente = normalizePersonFields(response?.user);
  const rowsOf = (key) => (Array.isArray(response?.[key]) ? response[key] : []);
  const withOwner = (row, index) => {
    const servizio = normalizeCatalogOffer(row, index);
    return servizio === null ? null : { ...servizio, offerente: utente };
  };
  return {
    utente,
    offerte: rowsOf('offers').map(withOwner).filter(Boolean),
    richieste: rowsOf('requests').map(withOwner).filter(Boolean),
  };
}

/**
 * One row of `GET /get-queues`: a standing offer or request the matchmaker
 * consumes.
 *
 * `tipo` and `stato` stay the wire words (`OFFER`/`REQUEST`,
 * `OPEN`/`IN_PROGRESS`/`CLOSED`), upper-cased once: the Italian labels are a
 * display decision the screen makes. A row without an id cannot be cancelled,
 * so it is dropped; a missing category or location is `null` and the card says
 * so instead of inventing one (`QueueController` dereferences the category
 * without a null check: `backend-gaps.md` G13).
 */
export function normalizeQueue(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const id = toIntegerOrNull(row.id);
  if (id === null) {
    return null;
  }
  const tipo = toTextOrNull(row.queueType);
  const stato = toTextOrNull(row.queueStatus);
  return {
    id,
    tipo: tipo === null ? null : tipo.toUpperCase(),
    stato: stato === null ? null : stato.toUpperCase(),
    localita: toTextOrNull(row.location),
    descrizione: toTextOrNull(row.serviceDescription),
    categoria: toTextOrNull(row.serviceCategory),
    daRemoto: typeof row.serviceRemote === 'boolean' ? row.serviceRemote : null,
    agreementId: toIntegerOrNull(row.agreementId),
  };
}

/**
 * `GET /get-queues` -> `[{...}]`, read from `response.queues`.
 * A missing list is an empty list, never a throw; an empty answer with a `404`
 * status is the caller's business (`api/areas/queues.js`), not this layer's.
 */
export function normalizeQueues(response) {
  const rows = Array.isArray(response?.queues) ? response.queues : [];
  return rows.map(normalizeQueue).filter(Boolean);
}

/**
 * One `messages[]` row of `GET /chats/agreement/{agreementId}`.
 *
 * The backend DTO carries `{id, chatId, username, message, creationDate}`
 * (`Backend/src/DTO/ChatMessageDTO.php`); the row keeps the backend's own order
 * (the query sorts by `creation_date ASC`) and adds nothing. A message with no
 * text is dropped like every other row the UI could not draw: `send-message`
 * accepts an empty string today because the entity has no constraint, so only
 * the client refuses it, and an old empty row must not become an blank bubble.
 */
export function normalizeChatMessage(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const id = toIntegerOrNull(row.id);
  const testo = toTextOrNull(row.message);
  if (id === null || testo === null) {
    return null;
  }
  return {
    id,
    chatId: toIntegerOrNull(row.chatId),
    autore: toTextOrNull(row.username),
    testo,
    inviatoIl: toTextOrNull(row.creationDate),
  };
}

/**
 * `GET /chats/agreement/{agreementId}` -> `{chatId, messaggi}`.
 *
 * `chatId` is `null` when the backend did not return one, and the screen reads
 * that as "cannot send yet": `POST /chats/send-message/{chatId}` needs it, and
 * the id only exists after the first history call created the chat.
 */
export function normalizeChatHistory(response) {
  const rows = Array.isArray(response?.messages) ? response.messages : [];
  return {
    chatId: toIntegerOrNull(response?.chatId),
    messaggi: rows.map(normalizeChatMessage).filter(Boolean),
  };
}

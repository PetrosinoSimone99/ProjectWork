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
function normalizeOwner(row) {
  const source = row?.owner ?? row?.offerente;
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
 * plus `categoryIds` with all of them, which the relevance ordering needs.
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

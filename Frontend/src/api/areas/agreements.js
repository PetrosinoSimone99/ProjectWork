import { ApiError, apiFetch } from '../client';
import { normalizeAgreements } from '../normalizers';

/**
 * Agreements area: the exchange lifecycle the backend exposes today.
 *
 * Real endpoints only: `GET /get-agreements`, `POST /create-exchange-agreement`,
 * `POST /send-agreement-response`, `POST /cancel-agreement/{id}` and the two
 * delivery-sheet calls `POST /send-agreement-details` /
 * `POST /accept-agreement-details/{id}`. The sheet calls need no participant
 * id (the old G6 blocker): `send` writes the caller's own row (`ad.user =
 * caller`, `Backend/src/Manager/AgreementManager.php:149-175`) and `accept`
 * confirms the row where the caller is the `beneficiary` (same file,
 * 201-228), so the agreement id is all either route takes.
 *
 * The creation body carries the **person** (`otherParticipant`), never a service
 * (G4): the agreement is born with that person and the service is named later
 * in the sheet. Duplicates with the same person are possible and are not masked.
 *
 * The backend answers `{error: {code, message}}` in English; every status the
 * screens can hit becomes its own Italian message here, so no screen maps
 * statuses and no English text reaches the UI.
 */

/** Italian copy for the statuses the six calls can answer. */
const MESSAGES = {
  /**
   * The two sheet calls. `400` only happens on send (invalid dates or a
   * missing field), `404` is agreement/sheet gone or not `ACCEPTED`, `500`
   * covers the rest — including "already confirmed": the accept route catches
   * the manager's `DomainException` with its generic `\Exception` branch and
   * answers `500`, never `409` (`AgreementManager.php:201-228`).
   */
  sheet: {
    400: "Controlla le date: la fine deve venire dopo l'inizio.",
    404: 'Non trovo più questo accordo o la sua scheda: ricarica e riprova.',
    500: "Il server non ha accettato la scheda: riprova, e se l'errore resta segnalalo.",
  },
  list: {
    401: 'Devi accedere per vedere i tuoi accordi.',
  },
  create: {
    400: 'Non puoi proporre uno scambio con te stesso.',
    401: 'Devi accedere per inviare una proposta.',
    404: 'Non trovo questa persona: potrebbe aver eliminato l’account.',
  },
  respond: {
    400: 'Controlla i dati inseriti: manca qualcosa o non è valido.',
    401: 'Devi accedere per rispondere alla proposta.',
    404: 'Non trovo più questo accordo: potrebbe essere cambiato.',
    409: 'Questo accordo ha già una risposta: non puoi rispondere due volte.',
  },
  cancel: {
    401: 'Devi accedere per annullare lo scambio.',
    404: 'Non trovo più questo accordo: potrebbe essere cambiato.',
  },
};

/** Rethrows with the Italian message of the table, other statuses untouched. */
async function withMessage(call, messages) {
  try {
    return await call;
  } catch (err) {
    if (err instanceof ApiError && messages[err.status]) {
      throw new ApiError(err.status, messages[err.status]);
    }
    throw err;
  }
}

/**
 * GET /get-agreements — every agreement the viewer participates in, in the
 * same shape for both participants. An empty list is not an error.
 */
export async function listAgreements(token) {
  return normalizeAgreements(
    await withMessage(apiFetch('get-agreements', { token }), MESSAGES.list),
  );
}

/**
 * POST /create-exchange-agreement — proposes an exchange to a person.
 * The `201` body is `{success: {code, message}}` with no agreement in it, so
 * this returns nothing: the caller finds the new agreement in
 * `GET /get-agreements`. Failures become Italian messages (400 yourself,
 * 404 unknown person).
 */
export async function sendExchangeProposal(token, otherParticipantId) {
  await withMessage(
    apiFetch('create-exchange-agreement', {
      method: 'POST',
      token,
      body: { otherParticipant: Number(otherParticipantId) },
    }),
    MESSAGES.create,
  );
}

/**
 * POST /send-agreement-response — the one answer of this participant.
 * `true` accepts, `false` refuses; the agreement becomes `ACCEPTED`/`REFUSED`
 * and a second answer is a `409`.
 */
export async function respondToAgreement(token, agreementId, accepted) {
  await withMessage(
    apiFetch('send-agreement-response', {
      method: 'POST',
      token,
      body: { agreementId: Number(agreementId), response: accepted === true },
    }),
    MESSAGES.respond,
  );
}

/**
 * POST /cancel-agreement/{id} — an `ACCEPTED` exchange becomes `CANCELLED`,
 * the status that replaced the old `VOID` (rows created before the rename keep
 * `VOID`, and both classify as closed history).
 * Answering `200` for an agreement that is not accepted leaves it unchanged
 * (the backend only acts on `ACCEPTED`), so the screen refreshes either way.
 */
export async function cancelAgreement(token, agreementId) {
  await withMessage(
    apiFetch(`cancel-agreement/${Number(agreementId)}`, { method: 'POST', token }),
    MESSAGES.cancel,
  );
}

/**
 * POST /send-agreement-details — fills the caller's own sheet row.
 *
 * The body carries only the agreement id, the remote flag and the two dates:
 * the row is looked up by `ad.user = caller`
 * (`Backend/src/Manager/AgreementManager.php:149-175`), so no participant id
 * is guessed (the old G6 blocker). The dates travel as date-only
 * `YYYY-MM-DD` strings — the backend parses them with `DateTimeImmutable` and
 * rejects an end that is not after the start with a `400`, which the form
 * checks first. The route answers `404` for an agreement that is not
 * `ACCEPTED`, `500` when the row cannot be written.
 */
export async function sendAgreementSheet(token, { agreementId, fromRemote, startDate, endDate }) {
  await withMessage(
    apiFetch('send-agreement-details', {
      method: 'POST',
      token,
      body: {
        agreementId: Number(agreementId),
        fromRemote: fromRemote === true,
        startDate: String(startDate),
        endDate: String(endDate),
      },
    }),
    MESSAGES.sheet,
  );
}

/**
 * POST /accept-agreement-details/{id} — the beneficiary confirms the other
 * side's row. The route takes the agreement id in the path and no body; the
 * row is found by `ad.beneficiary = caller` (`AgreementManager.php:201-228`).
 * Confirming a row that is already accepted answers `500`, not `409`: the
 * manager throws a `DomainException` that the controller catches with its
 * generic `\Exception` branch, so the `500` copy is what a double tap gets.
 */
export async function acceptAgreementSheet(token, agreementId) {
  await withMessage(
    apiFetch(`accept-agreement-details/${Number(agreementId)}`, { method: 'POST', token }),
    MESSAGES.sheet,
  );
}

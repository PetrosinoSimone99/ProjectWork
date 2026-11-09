import { ApiError, apiFetch } from '../client';
import { normalizeAgreements } from '../normalizers';

/**
 * Agreements area: the exchange lifecycle the backend exposes today.
 *
 * Real endpoints only: `GET /get-agreements`, `POST /create-exchange-agreement`,
 * `POST /send-agreement-response`, `POST /cancel-agreement/{id}`. The delivery
 * sheet (`POST /send-agreement-details`) is not called: it needs a `beneficiaryId`
 * that the agreement rows do not carry (`docs/backend-gaps.md` G6).
 *
 * The creation body carries the **person** (`otherParticipant`), never a service
 * (G4): the agreement is born with that person and the service is named later
 * in the sheet. Duplicates with the same person are possible and are not masked.
 *
 * The backend answers `{error: {code, message}}` in English; every status the
 * screens can hit becomes its own Italian message here, so no screen maps
 * statuses and no English text reaches the UI.
 */

/** Italian copy for the statuses the four calls can answer. */
const MESSAGES = {
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
 * POST /cancel-agreement/{id} — an `ACCEPTED` exchange becomes `VOID`.
 * Answering `200` for an agreement that is not accepted leaves it unchanged
 * (the backend only acts on `ACCEPTED`), so the screen refreshes either way.
 */
export async function cancelAgreement(token, agreementId) {
  await withMessage(
    apiFetch(`cancel-agreement/${Number(agreementId)}`, { method: 'POST', token }),
    MESSAGES.cancel,
  );
}

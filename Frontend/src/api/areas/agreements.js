import { ApiError, apiFetch } from '../client';
import { normalizeAgreements } from '../normalizers';


/** Italian copy for the statuses the six calls can answer. */
const MESSAGES = {

  sheet: {
    409: 'La scheda non può essere modificata o confermata nello stato attuale.',
    400: "Controlla le date: la fine deve venire dopo l'inizio.",
    404: 'Non trovo più questo accordo o la sua scheda: ricarica e riprova.',
    500: "Il server non ha accettato la scheda: riprova, e se l'errore resta segnalalo.",
  },
  list: {
    401: 'Devi accedere per vedere i tuoi accordi.',
  },
  create: {
    409: 'La proposta è già in attesa oppure una delle offerte non è disponibile.',
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
export async function sendExchangeProposal(token, otherParticipantId, serviceId) {
  await withMessage(
    apiFetch('create-exchange-agreement', {
      method: 'POST',
      token,
      body: { otherParticipant: Number(otherParticipantId), serviceId: Number(serviceId) },
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


export async function acceptAgreementSheet(token, agreementId) {
  await withMessage(
    apiFetch(`accept-agreement-details/${Number(agreementId)}`, { method: 'POST', token }),
    MESSAGES.sheet,
  );
}
